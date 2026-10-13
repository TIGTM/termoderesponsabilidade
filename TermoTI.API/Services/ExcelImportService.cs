using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using TermoTI.API.Data;
using TermoTI.API.Models;

namespace TermoTI.API.Services;

public class ExcelImportService
{
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

        int registrosImportados = 0;

        for (int linha = primeiraLinha.RowNumber();
             linha <= ultimaLinha.RowNumber();
             linha++)
        {

            var patrimonio = planilha.Cell(linha, 2)
                .GetString()
                .Trim();

            if (string.IsNullOrWhiteSpace(patrimonio))
            {
                continue;
            }

            if (patrimonio.Equals(
                "PATRIMONIO",
                StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            // Ignora linha de resumo
            if (patrimonio.StartsWith(
                "Total de registros:",
                StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }


            var responsavel = planilha.Cell(linha, 10)
                .GetString()
                .Trim();

            var email = planilha.Cell(linha, 11)
                .GetString()
                .Trim();

            var telefone = planilha.Cell(linha, 12)
                .GetString()
                .Trim();


            Colaborador? colaborador = null;

            if (!string.IsNullOrWhiteSpace(email))
            {
                colaborador = await _context.Colaboradores
                    .FirstOrDefaultAsync(c => c.Email == email);
            }

            if (colaborador == null &&
                !string.IsNullOrWhiteSpace(responsavel))
            {
                colaborador = await _context.Colaboradores
                    .FirstOrDefaultAsync(c => c.Nome == responsavel);
            }


            if (colaborador == null)
            {
                colaborador = new Colaborador
                {
                    Nome = responsavel,
                    NomeCompleto = responsavel,
                    Email = string.IsNullOrWhiteSpace(email)
                        ? null
                        : email,
                    Telefone = string.IsNullOrWhiteSpace(telefone)
                        ? null
                        : telefone
                };

                _context.Colaboradores.Add(colaborador);

                await _context.SaveChangesAsync();
            }
            else
            {

                if (!string.IsNullOrWhiteSpace(responsavel))
                    colaborador.Nome = responsavel;

                if (!string.IsNullOrWhiteSpace(email))
                    colaborador.Email = email;

                if (!string.IsNullOrWhiteSpace(telefone))
                    colaborador.Telefone = telefone;

                await _context.SaveChangesAsync();
            }

            // =========================
            // PROCURA EQUIPAMENTO
            // =========================

            var equipamento = await _context.Equipamentos
                .FirstOrDefaultAsync(e => e.Patrimonio == patrimonio);

            // Se não existe, cria
            if (equipamento == null)
            {
                equipamento = new Equipamento();

                _context.Equipamentos.Add(equipamento);
            }

            // =========================
            // DADOS BÁSICOS
            // =========================

            equipamento.Patrimonio = patrimonio;

            equipamento.Categoria = planilha.Cell(linha, 3)
                .GetString()
                .Trim();

            equipamento.Marca = planilha.Cell(linha, 4)
                .GetString()
                .Trim();

            equipamento.Modelo = planilha.Cell(linha, 5)
                .GetString()
                .Trim();

            equipamento.Serial = planilha.Cell(linha, 6)
                .GetString()
                .Trim();

            equipamento.Local = planilha.Cell(linha, 7)
                .GetString()
                .Trim();

            equipamento.Setor = planilha.Cell(linha, 8)
                .GetString()
                .Trim();

            equipamento.Status = planilha.Cell(linha, 9)
                .GetString()
                .Trim();

            equipamento.ResponsavelId = colaborador.Id;

            equipamento.Email = string.IsNullOrWhiteSpace(email)
                ? null
                : email;

            equipamento.Telefone = string.IsNullOrWhiteSpace(telefone)
                ? null
                : telefone;

            // =========================
            // COMPUTADOR
            // =========================

            equipamento.Processador = planilha.Cell(linha, 14)
                .GetString()
                .Trim();

            equipamento.MemoriaRam = planilha.Cell(linha, 15)
                .GetString()
                .Trim();

            equipamento.Armazenamento = planilha.Cell(linha, 16)
                .GetString()
                .Trim();

            equipamento.SistemaOperacional = planilha.Cell(linha, 17)
                .GetString()
                .Trim();

            // =========================
            // NOME NA REDE
            // =========================

            equipamento.NomeRede = planilha.Cell(linha, 19)
                .GetString()
                .Trim();

            // =========================
            // TIPO
            // =========================

            equipamento.Tipo = planilha.Cell(linha, 20)
                .GetString()
                .Trim();

            // =========================
            // CELULAR
            // =========================

            equipamento.IMEI1 = planilha.Cell(linha, 21)
                .GetString()
                .Trim();

            equipamento.IMEI2 = planilha.Cell(linha, 22)
                .GetString()
                .Trim();

            equipamento.Capacidade = planilha.Cell(linha, 23)
                .GetString()
                .Trim();

            equipamento.Cor = planilha.Cell(linha, 24)
                .GetString()
                .Trim();

            // =========================
            // CONDIÇÃO / OBSERVAÇÕES
            // =========================

            equipamento.Condicao = planilha.Cell(linha, 25)
                .GetString()
                .Trim();

            equipamento.Observacoes = planilha.Cell(linha, 26)
                .GetString()
                .Trim();

            // =========================
            // DATA DA COMPRA
            // =========================

            if (planilha.Cell(linha, 27)
                .TryGetValue<DateTime>(out var dataCompra))
            {
                equipamento.DataCompra = dataCompra;
            }
            else
            {
                equipamento.DataCompra = null;
            }

            // =========================
            // FORNECEDOR
            // =========================

            equipamento.Fornecedor = planilha.Cell(linha, 28)
                .GetString()
                .Trim();

            // =========================
            // NOTA FISCAL
            // =========================

            equipamento.NotaFiscal = planilha.Cell(linha, 29)
                .GetString()
                .Trim();

            // =========================
            // VALOR
            // =========================

            if (planilha.Cell(linha, 30)
                .TryGetValue<decimal>(out var valor))
            {
                equipamento.Valor = valor;
            }
            else
            {
                equipamento.Valor = null;
            }

            // =========================
            // GARANTIA
            // =========================

            if (planilha.Cell(linha, 31)
                .TryGetValue<DateTime>(out var garantia))
            {
                equipamento.Garantia = garantia;
            }
            else
            {
                equipamento.Garantia = null;
            }

            // =========================
            // SALVA EQUIPAMENTO
            // =========================

            await _context.SaveChangesAsync();

            registrosImportados++;

            Console.WriteLine(
                $"Importado: {equipamento.Patrimonio} | " +
                $"{equipamento.Marca} {equipamento.Modelo} | " +
                $"Responsável: {responsavel}"
            );
        }

        Console.WriteLine();
        Console.WriteLine(
            $"Registros importados/atualizados: {registrosImportados}"
        );

        return registrosImportados;
    }
}