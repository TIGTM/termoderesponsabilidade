using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TermoTI.API.Data;
using TermoTI.API.DTOs;
using TermoTI.API.Models;

namespace TermoTI.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TermosController : ControllerBase
{
    private readonly TermoTIDbContext _context;

    public TermosController(TermoTIDbContext context)
    {
        _context = context;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult> GetTermo(int id)
    {
        var termo = await _context.Termos
            .FirstOrDefaultAsync(t => t.Id == id);

        if (termo == null)
        {
            return NotFound();
        }

        var colaborador = await _context.Colaboradores
            .FirstOrDefaultAsync(c => c.Id == termo.ColaboradorId);

        var itens = await _context.TermoItens
            .Where(ti => ti.TermoId == id)
            .ToListAsync();

        var equipamentos = new List<object>();

        foreach (var item in itens)
        {
            var equipamento = await _context.Equipamentos
                .FirstOrDefaultAsync(e => e.Id == item.EquipamentoId);

            if (equipamento != null)
            {
                equipamentos.Add(new
                {
                    id = equipamento.Id,
                    patrimonio = equipamento.Patrimonio,
                    categoria = equipamento.Categoria,
                    tipo = equipamento.Tipo,
                    marca = equipamento.Marca,
                    modelo = equipamento.Modelo,
                    serial = equipamento.Serial,
                    status = equipamento.Status,
                    local = equipamento.Local,
                    setor = equipamento.Setor,
                    observacao = item.Observacao
                });
            }
        }

        return Ok(new
        {
            id = termo.Id,
            colaboradorId = termo.ColaboradorId,
            status = termo.Status,
            dataAssinatura = termo.DataAssinatura,
            assinatura = termo.Assinatura,
            documentoHTML = termo.DocumentoHTML,
            criadoEm = termo.CriadoEm,

            ipAssinatura = termo.IPAssinatura,
            latitude = termo.Latitude,
            longitude = termo.Longitude,
            precisaoLocalizacao = termo.PrecisaoLocalizacao,

            tipoDocumento = termo.TipoDocumento,
            nomeDocumento = termo.NomeDocumento,

            colaborador = colaborador == null ? null : new
            {
                id = colaborador.Id,
                nome = colaborador.Nome,
                nomeCompleto = colaborador.NomeCompleto,
                cpf = colaborador.CPF,
                email = colaborador.Email,
                telefone = colaborador.Telefone,
                cep = colaborador.CEP,
                rua = colaborador.Rua,
                numero = colaborador.Numero,
                bairro = colaborador.Bairro,
                cidade = colaborador.Cidade,
                estado = colaborador.Estado
            },

            equipamentos = equipamentos
        });
    }

    [HttpPost]
    public async Task<ActionResult> CriarTermo(CriarTermoDto dto)
    {
        var colaboradorExiste = await _context.Colaboradores
            .AnyAsync(c => c.Id == dto.ColaboradorId);

        if (!colaboradorExiste)
        {
            return BadRequest(new
            {
                mensagem = "O colaborador informado não existe."
            });
        }

        foreach (var item in dto.Equipamentos)
        {
            var equipamentoExiste = await _context.Equipamentos
                .AnyAsync(e => e.Id == item.EquipamentoId);

            if (!equipamentoExiste)
            {
                return BadRequest(new
                {
                    mensagem = $"O equipamento ID {item.EquipamentoId} não existe."
                });
            }
        }

        var termo = new Termo
        {
            ColaboradorId = dto.ColaboradorId,
            Status = dto.Status ?? "Pendente",
            DocumentoHTML = dto.DocumentoHTML,
            CriadoEm = DateTime.Now
        };

        _context.Termos.Add(termo);

        await _context.SaveChangesAsync();

        foreach (var item in dto.Equipamentos)
        {
            var termoItem = new TermoItem
            {
                TermoId = termo.Id,
                EquipamentoId = item.EquipamentoId,
                Observacao = item.Observacao
            };

            _context.TermoItens.Add(termoItem);
        }

        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetTermo),
            new
            {
                id = termo.Id
            },
            new
            {
                id = termo.Id,
                colaboradorId = termo.ColaboradorId,
                status = termo.Status,
                documentoHTML = termo.DocumentoHTML,
                equipamentos = dto.Equipamentos
            }
        );
    }

    [HttpPost("{id}/assinar")]
    public async Task<IActionResult> AssinarTermo(
        int id,
        AssinarTermoDto dto)
    {
        var termo = await _context.Termos
            .FirstOrDefaultAsync(t => t.Id == id);

        if (termo == null)
        {
            return NotFound(new
            {
                mensagem = "Termo não encontrado."
            });
        }

        if (string.IsNullOrWhiteSpace(dto.Assinatura))
        {
            return BadRequest(new
            {
                mensagem = "A assinatura não foi informada."
            });
        }

        if (string.IsNullOrWhiteSpace(dto.TipoDocumento))
        {
            return BadRequest(new
            {
                mensagem = "O tipo do documento não foi informado."
            });
        }

        if (string.IsNullOrWhiteSpace(dto.NomeDocumento))
        {
            return BadRequest(new
            {
                mensagem = "O número do documento não foi informado."
            });
        }

        if (string.IsNullOrWhiteSpace(dto.DocumentoFrente))
        {
            return BadRequest(new
            {
                mensagem = "A foto da frente do documento não foi enviada."
            });
        }

        try
        {
            var base64Assinatura = dto.Assinatura;

            if (base64Assinatura.Contains(","))
            {
                base64Assinatura = base64Assinatura.Substring(
                    base64Assinatura.IndexOf(",") + 1
                );
            }

            termo.Assinatura = Convert.FromBase64String(
                base64Assinatura
            );

            termo.DocumentoFrente = ConverterBase64ParaBytes(
                dto.DocumentoFrente
            );

            if (!string.IsNullOrWhiteSpace(dto.DocumentoVerso))
            {
                termo.DocumentoVerso = ConverterBase64ParaBytes(
                    dto.DocumentoVerso
                );
            }
            else
            {
                termo.DocumentoVerso = null;
            }

            termo.TipoDocumento = dto.TipoDocumento;
            termo.NomeDocumento = dto.NomeDocumento;

            termo.Status = "Assinado";
            termo.DataAssinatura = DateTime.Now;

            termo.Latitude = dto.Latitude;
            termo.Longitude = dto.Longitude;
            termo.PrecisaoLocalizacao = dto.PrecisaoLocalizacao;

            termo.IPAssinatura = HttpContext
                .Connection
                .RemoteIpAddress?
                .ToString();

            var itens = await _context.TermoItens
                .Where(ti => ti.TermoId == id)
                .ToListAsync();

            foreach (var item in itens)
            {
                var equipamento = await _context.Equipamentos
                    .FirstOrDefaultAsync(e => e.Id == item.EquipamentoId);

                if (equipamento != null)
                {
                    equipamento.Status = "Em uso";
                    equipamento.ResponsavelId = termo.ColaboradorId;
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                mensagem = "Termo assinado com sucesso.",
                termoId = termo.Id,
                status = termo.Status,
                dataAssinatura = termo.DataAssinatura,
                ipAssinatura = termo.IPAssinatura,
                latitude = termo.Latitude,
                longitude = termo.Longitude,
                precisaoLocalizacao = termo.PrecisaoLocalizacao,
                tipoDocumento = termo.TipoDocumento,
                nomeDocumento = termo.NomeDocumento
            });
        }
        catch (FormatException)
        {
            return BadRequest(new
            {
                mensagem = "A assinatura ou uma das imagens enviadas não está em um formato Base64 válido."
            });
        }
        catch (InvalidOperationException erro)
        {
            return BadRequest(new
            {
                mensagem = erro.Message
            });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> AtualizarTermo(
        int id,
        Termo termoRecebido)
    {
        if (id != termoRecebido.Id)
        {
            return BadRequest(new
            {
                mensagem = "O ID informado na URL é diferente do ID do termo."
            });
        }

        var termo = await _context.Termos
            .FirstOrDefaultAsync(t => t.Id == id);

        if (termo == null)
        {
            return NotFound(new
            {
                mensagem = "Termo não encontrado."
            });
        }

        termo.ColaboradorId = termoRecebido.ColaboradorId;
        termo.Status = termoRecebido.Status;
        termo.DocumentoHTML = termoRecebido.DocumentoHTML;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("/api/admin/termos")]
    public async Task<ActionResult<IEnumerable<object>>> GetTermosAdmin()
    {
        var termos = await _context.Termos
            .AsNoTracking()
            .ToListAsync();

        var resultado = termos.Select(t => new
        {
            id = t.Id,
            colaboradorId = t.ColaboradorId,
            status = t.Status,
            dataAssinatura = t.DataAssinatura,
            criadoEm = t.CriadoEm,

            ipAssinatura = t.IPAssinatura,
            latitude = t.Latitude,
            longitude = t.Longitude,
            precisaoLocalizacao = t.PrecisaoLocalizacao,

            tipoDocumento = t.TipoDocumento,
            nomeDocumento = t.NomeDocumento,

            documentoHTML = t.DocumentoHTML,

            documentoFrente = ConverterBytesParaDataUrl(
                t.DocumentoFrente
            ),

            documentoVerso = ConverterBytesParaDataUrl(
                t.DocumentoVerso
            )
        });

        return Ok(resultado);
    }

    [HttpGet("por-colaborador/{colaboradorId}")]
    public async Task<ActionResult> GetTermoPorColaborador(
        int colaboradorId)
    {
        var termo = await _context.Termos
            .Where(t => t.ColaboradorId == colaboradorId)
            .OrderByDescending(t => t.CriadoEm)
            .FirstOrDefaultAsync();

        if (termo == null)
        {
            return NotFound();
        }

        return Ok(new
        {
            id = termo.Id,
            colaboradorId = termo.ColaboradorId,
            status = termo.Status,
            dataAssinatura = termo.DataAssinatura,
            assinatura = termo.Assinatura,
            documentoHTML = termo.DocumentoHTML,
            criadoEm = termo.CriadoEm,
            ipAssinatura = termo.IPAssinatura,
            latitude = termo.Latitude,
            longitude = termo.Longitude,
            precisaoLocalizacao = termo.PrecisaoLocalizacao,
            tipoDocumento = termo.TipoDocumento,
            nomeDocumento = termo.NomeDocumento
        });
    }

    private static byte[] ConverterBase64ParaBytes(string base64)
    {
        if (string.IsNullOrWhiteSpace(base64))
        {
            throw new InvalidOperationException(
                "A imagem enviada está vazia."
            );
        }

        var base64Limpo = base64;

        if (base64Limpo.Contains(","))
        {
            base64Limpo = base64Limpo.Substring(
                base64Limpo.IndexOf(",") + 1
            );
        }

        byte[] arquivo;

        try
        {
            arquivo = Convert.FromBase64String(
                base64Limpo
            );
        }
        catch (FormatException)
        {
            throw new FormatException(
                "A imagem enviada não está em um formato Base64 válido."
            );
        }

        const int limite = 5 * 1024 * 1024;

        if (arquivo.Length > limite)
        {
            throw new InvalidOperationException(
                "A imagem do documento não pode ultrapassar 5 MB."
            );
        }

        return arquivo;
    }

    private static string? ConverterBytesParaDataUrl(byte[]? arquivo)
    {
        if (arquivo == null || arquivo.Length == 0)
        {
            return null;
        }

        var tipoMime = DetectarTipoImagem(arquivo);

        return $"data:{tipoMime};base64,{Convert.ToBase64String(arquivo)}";
    }

    private static string DetectarTipoImagem(byte[] arquivo)
    {
        if (arquivo.Length >= 3 &&
            arquivo[0] == 0xFF &&
            arquivo[1] == 0xD8 &&
            arquivo[2] == 0xFF)
        {
            return "image/jpeg";
        }

        if (arquivo.Length >= 8 &&
            arquivo[0] == 0x89 &&
            arquivo[1] == 0x50 &&
            arquivo[2] == 0x4E &&
            arquivo[3] == 0x47 &&
            arquivo[4] == 0x0D &&
            arquivo[5] == 0x0A &&
            arquivo[6] == 0x1A &&
            arquivo[7] == 0x0A)
        {
            return "image/png";
        }

        if (arquivo.Length >= 12 &&
            arquivo[0] == 0x52 &&
            arquivo[1] == 0x49 &&
            arquivo[2] == 0x46 &&
            arquivo[3] == 0x46 &&
            arquivo[8] == 0x57 &&
            arquivo[9] == 0x45 &&
            arquivo[10] == 0x42 &&
            arquivo[11] == 0x50)
        {
            return "image/webp";
        }

        if (arquivo.Length >= 6 &&
            arquivo[0] == 0x47 &&
            arquivo[1] == 0x49 &&
            arquivo[2] == 0x46 &&
            arquivo[3] == 0x38)
        {
            return "image/gif";
        }

        if (arquivo.Length >= 2 &&
            arquivo[0] == 0x42 &&
            arquivo[1] == 0x4D)
        {
            return "image/bmp";
        }

        return "image/jpeg";
    }
}