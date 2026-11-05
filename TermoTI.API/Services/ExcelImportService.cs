
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using TermoTI.API.Data;
using TermoTI.API.Models;

namespace TermoTI.API.Services;

public class ExcelImportService
{
    private const string StatusHistorico = "Histórico";

    private readonly TermoTIDbContext _context;

    public ExcelImportService(TermoTIDbContext context)
    {
        _context = context;
    }

    public async Task<int> ImportarExcelAsync(string caminhoArquivo)
    {
        using var workbook = new XLWorkbook(caminhoArquivo);

        var planilha = workbook.Worksheet(1);
        var primeiraLinha = planilha.FirstRowUsed();
        var ultimaLinha = planilha.LastRowUsed();

        if (primeiraLinha == null || ultimaLinha == null)
            throw new InvalidOperationException("A planilha está vazia.");

        var registros = new List<RegistroExcel>();

        for (int linha = primeiraLinha.RowNumber();
             linha <= ultimaLinha.RowNumber();
             linha++)
        {
            var patrimonio = LerTexto(planilha, linha, 2);

            if (string.IsNullOrWhiteSpace(patrimonio))
                continue;

            if (patrimonio.Equals(
                "PATRIMONIO",
                StringComparison.OrdinalIgnoreCase))
                continue;

            if (patrimonio.StartsWith(
                "Total de registros:",
                StringComparison.OrdinalIgnoreCase))
                continue;

            registros.Add(new RegistroExcel
            {
                Patrimonio = patrimonio,
                Categoria = LerTexto(planilha, linha, 3),
                Marca = LerTexto(planilha, linha, 4),
                Modelo = LerTexto(planilha, linha, 5),
                Serial = LerTexto(planilha, linha, 6),
                Local = LerTexto(planilha, linha, 7),
                Setor = LerTexto(planilha, linha, 8),
                Status = LerTexto(planilha, linha, 9),
                Responsavel = LerTexto(planilha, linha, 10),
                Email = LerTexto(planilha, linha, 11),
                Telefone = LerTexto(planilha, linha, 12),
                Processador = LerTexto(planilha, linha, 14),
                MemoriaRam = LerTexto(planilha, linha, 15),
                Armazenamento = LerTexto(planilha, linha, 16),
                SistemaOperacional = LerTexto(planilha, linha, 17),
                NomeRede = LerTexto(planilha, linha, 19),
                Tipo = LerTexto(planilha, linha, 20),
                IMEI1 = LerTexto(planilha, linha, 21),
                IMEI2 = LerTexto(planilha, linha, 22),
                Capacidade = LerTexto(planilha, linha, 23),
                Cor = LerTexto(planilha, linha, 24),
                Condicao = LerTexto(planilha, linha, 25),
                Observacoes = LerTexto(planilha, linha, 26),
                DataCompra = LerData(planilha.Cell(linha, 27)),
                Fornecedor = LerTexto(planilha, linha, 28),
                NotaFiscal = LerTexto(planilha, linha, 29),
                Valor = LerDecimal(planilha.Cell(linha, 30)),
                Garantia = LerData(planilha.Cell(linha, 31))
            });
        }

        if (registros.Count == 0)
        {
            throw new InvalidOperationException(
                "Nenhum equipamento válido foi encontrado. " +
                "A sincronização foi cancelada para evitar exclusões indevidas."
            );
        }

        var patrimonioDuplicado = registros
            .GroupBy(
                r => r.Patrimonio,
                StringComparer.OrdinalIgnoreCase)
            .FirstOrDefault(g => g.Count() > 1);

        if (patrimonioDuplicado != null)
        {
            throw new InvalidOperationException(
                $"O patrimônio '{patrimonioDuplicado.Key}' aparece mais de uma vez no Excel."
            );
        }

        var nomesPresentesNoExcel = registros
            .Where(r => !string.IsNullOrWhiteSpace(r.Responsavel))
            .Select(r => NormalizarNome(r.Responsavel))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var patrimoniosPresentesNoExcel = registros
            .Select(r => r.Patrimonio)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        await using var transacao =
            await _context.Database.BeginTransactionAsync();

        var colaboradores = await _context.Colaboradores.ToListAsync();
        var equipamentos = await _context.Equipamentos.ToListAsync();
        var termos = await _context.Termos.ToListAsync();

        var colaboradoresPorNome =
            new Dictionary<string, Colaborador>(
                StringComparer.OrdinalIgnoreCase);

        foreach (var grupo in colaboradores
            .Where(c => !string.IsNullOrWhiteSpace(c.Nome))
            .GroupBy(c => NormalizarNome(c.Nome)))
        {
            if (!nomesPresentesNoExcel.Contains(grupo.Key))
                continue;

            if (grupo.Count() > 1)
            {
                throw new InvalidOperationException(
                    $"Existem colaboradores duplicados com o nome '{grupo.First().Nome}'. " +
                    "Corrija o cadastro antes de importar."
                );
            }

            colaboradoresPorNome[grupo.Key] = grupo.First();
        }

        foreach (var registro in registros)
        {
            if (string.IsNullOrWhiteSpace(registro.Responsavel))
                continue;

            var nomeNormalizado = NormalizarNome(registro.Responsavel);

            if (!colaboradoresPorNome.TryGetValue(
                nomeNormalizado,
                out var colaborador))
            {
                colaborador = new Colaborador
                {
                    Nome = registro.Responsavel,
                    NomeCompleto = registro.Responsavel,
                    Email = string.IsNullOrWhiteSpace(registro.Email)
                        ? null
                        : registro.Email,
                    Telefone = string.IsNullOrWhiteSpace(registro.Telefone)
                        ? null
                        : registro.Telefone
                };

                _context.Colaboradores.Add(colaborador);
                colaboradoresPorNome[nomeNormalizado] = colaborador;
            }
            else
            {
                colaborador.Nome = registro.Responsavel;
                colaborador.NomeCompleto = registro.Responsavel;

                if (!string.IsNullOrWhiteSpace(registro.Email))
                    colaborador.Email = registro.Email;

                if (!string.IsNullOrWhiteSpace(registro.Telefone))
                    colaborador.Telefone = registro.Telefone;
            }
        }

        var colaboradoresAusentes = colaboradores
            .Where(c =>
                !nomesPresentesNoExcel.Contains(
                    NormalizarNome(c.Nome)))
            .ToList();

        var idsColaboradoresAusentes = colaboradoresAusentes
            .Select(c => c.Id)
            .ToHashSet();

        var equipamentosAusentes = equipamentos
            .Where(e =>
                !string.IsNullOrWhiteSpace(e.Patrimonio) &&
                !patrimoniosPresentesNoExcel.Contains(e.Patrimonio))
            .ToList();

        var idsEquipamentosAusentes = equipamentosAusentes
            .Select(e => e.Id)
            .ToHashSet();

        var idsTermosComEquipamentoAusente = new HashSet<int>();

        if (idsEquipamentosAusentes.Count > 0)
        {
            var idsEncontrados = await _context.TermoItens
                .Where(ti =>
                    idsEquipamentosAusentes.Contains(ti.EquipamentoId))
                .Select(ti => ti.TermoId)
                .Distinct()
                .ToListAsync();

            idsTermosComEquipamentoAusente =
                idsEncontrados.ToHashSet();
        }


        var termosPendentesParaExcluir = termos
            .Where(t =>
                !EhAssinado(t.Status) &&
                (
                    idsColaboradoresAusentes.Contains(t.ColaboradorId) ||
                    idsTermosComEquipamentoAusente.Contains(t.Id)
                ))
            .ToList();

        _context.Termos.RemoveRange(termosPendentesParaExcluir);

        var idsComTermoAssinado = termos
            .Where(t =>
                idsColaboradoresAusentes.Contains(t.ColaboradorId) &&
                EhAssinado(t.Status))
            .Select(t => t.ColaboradorId)
            .ToHashSet();

        var colaboradoresParaExcluir = colaboradoresAusentes
            .Where(c => !idsComTermoAssinado.Contains(c.Id))
            .ToList();

        _context.Colaboradores.RemoveRange(colaboradoresParaExcluir);


        await _context.SaveChangesAsync();


        var equipamentosPorPatrimonio = new Dictionary<string, Equipamento>(
            StringComparer.OrdinalIgnoreCase);

        foreach (var grupo in equipamentos
            .Where(e => !string.IsNullOrWhiteSpace(e.Patrimonio))
            .GroupBy(e => e.Patrimonio!, StringComparer.OrdinalIgnoreCase))
        {
            if (grupo.Count() > 1)
            {
                throw new InvalidOperationException(
                    $"Existem equipamentos duplicados com o patrimônio '{grupo.Key}' no banco."
                );
            }

            equipamentosPorPatrimonio[grupo.Key] = grupo.First();
        }

        foreach (var registro in registros)
        {
            if (!equipamentosPorPatrimonio.TryGetValue(
                registro.Patrimonio,
                out var equipamento))
            {
                equipamento = new Equipamento
                {
                    Patrimonio = registro.Patrimonio
                };

                _context.Equipamentos.Add(equipamento);
                equipamentosPorPatrimonio[registro.Patrimonio] = equipamento;
            }

            equipamento.Patrimonio = registro.Patrimonio;
            equipamento.Categoria = registro.Categoria;
            equipamento.Tipo = registro.Tipo;
            equipamento.Marca = registro.Marca;
            equipamento.Modelo = registro.Modelo;
            equipamento.Serial = registro.Serial;
            equipamento.Local = registro.Local;
            equipamento.Setor = registro.Setor;
            equipamento.Status = registro.Status;

            equipamento.Processador = registro.Processador;
            equipamento.MemoriaRam = registro.MemoriaRam;
            equipamento.Armazenamento = registro.Armazenamento;
            equipamento.SistemaOperacional = registro.SistemaOperacional;
            equipamento.NomeRede = registro.NomeRede;

            equipamento.IMEI1 = registro.IMEI1;
            equipamento.IMEI2 = registro.IMEI2;
            equipamento.Capacidade = registro.Capacidade;
            equipamento.Cor = registro.Cor;

            equipamento.Condicao = registro.Condicao;
            equipamento.Observacoes = registro.Observacoes;

            equipamento.DataCompra = registro.DataCompra;
            equipamento.Fornecedor = registro.Fornecedor;
            equipamento.NotaFiscal = registro.NotaFiscal;
            equipamento.Valor = registro.Valor;
            equipamento.Garantia = registro.Garantia;

            equipamento.Email = string.IsNullOrWhiteSpace(registro.Email)
                ? null
                : registro.Email;

            equipamento.Telefone = string.IsNullOrWhiteSpace(registro.Telefone)
                ? null
                : registro.Telefone;

            if (string.IsNullOrWhiteSpace(registro.Responsavel))
            {
                equipamento.ResponsavelId = null;
            }
            else
            {
                var nomeNormalizado =
                    NormalizarNome(registro.Responsavel);

                equipamento.ResponsavelId =
                    colaboradoresPorNome[nomeNormalizado].Id;
            }
        }


        var idsEquipamentosAindaVinculados = new HashSet<int>();

        if (idsEquipamentosAusentes.Count > 0)
        {
            var idsVinculados = await _context.TermoItens
                .Where(ti =>
                    idsEquipamentosAusentes.Contains(ti.EquipamentoId))
                .Select(ti => ti.EquipamentoId)
                .Distinct()
                .ToListAsync();

            idsEquipamentosAindaVinculados =
                idsVinculados.ToHashSet();
        }


        foreach (var equipamento in equipamentosAusentes)
        {
            if (idsEquipamentosAindaVinculados.Contains(equipamento.Id))
            {
                equipamento.Status = StatusHistorico;
                equipamento.ResponsavelId = null;
            }
            else
            {
                _context.Equipamentos.Remove(equipamento);
            }
        }

        // 15. Confirma todas as alterações.
        await _context.SaveChangesAsync();
        await transacao.CommitAsync();

        Console.WriteLine(
            $"Sincronização concluída. Equipamentos processados: {registros.Count}"
        );

        return registros.Count;
    }

    private static string LerTexto(
        IXLWorksheet planilha,
        int linha,
        int coluna)
    {
        return planilha.Cell(linha, coluna)
            .GetString()
            .Trim();
    }

    private static DateTime? LerData(IXLCell celula)
    {
        return celula.TryGetValue<DateTime>(out var data)
            ? data
            : null;
    }

    private static decimal? LerDecimal(IXLCell celula)
    {
        return celula.TryGetValue<decimal>(out var valor)
            ? valor
            : null;
    }

    private static string NormalizarNome(string? nome)
    {
        return string.Join(
            " ",
            (nome ?? string.Empty)
                .Trim()
                .Split(
                    ' ',
                    StringSplitOptions.RemoveEmptyEntries));
    }

    private static bool EhAssinado(string? status)
    {
        return string.Equals(
            status?.Trim(),
            "Assinado",
            StringComparison.OrdinalIgnoreCase);
    }

    private sealed class RegistroExcel
    {
        public string Patrimonio { get; set; } = string.Empty;
        public string Categoria { get; set; } = string.Empty;
        public string Marca { get; set; } = string.Empty;
        public string Modelo { get; set; } = string.Empty;
        public string Serial { get; set; } = string.Empty;
        public string Local { get; set; } = string.Empty;
        public string Setor { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Responsavel { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Telefone { get; set; } = string.Empty;

        public string Processador { get; set; } = string.Empty;
        public string MemoriaRam { get; set; } = string.Empty;
        public string Armazenamento { get; set; } = string.Empty;
        public string SistemaOperacional { get; set; } = string.Empty;
        public string NomeRede { get; set; } = string.Empty;

        public string Tipo { get; set; } = string.Empty;
        public string IMEI1 { get; set; } = string.Empty;
        public string IMEI2 { get; set; } = string.Empty;
        public string Capacidade { get; set; } = string.Empty;
        public string Cor { get; set; } = string.Empty;

        public string Condicao { get; set; } = string.Empty;
        public string Observacoes { get; set; } = string.Empty;

        public DateTime? DataCompra { get; set; }
        public string Fornecedor { get; set; } = string.Empty;
        public string NotaFiscal { get; set; } = string.Empty;
        public decimal? Valor { get; set; }
        public DateTime? Garantia { get; set; }
    }
}
