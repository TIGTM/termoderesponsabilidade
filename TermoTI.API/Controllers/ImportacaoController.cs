
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TermoTI.API.Services;

namespace TermoTI.API.Controllers;

[ApiController]
[Authorize]
[Route("api/admin/[controller]")]
public class ImportacaoController : ControllerBase
{
    private readonly ExcelImportService _excelImportService;

    public ImportacaoController(
        ExcelImportService excelImportService)
    {
        _excelImportService = excelImportService;
    }

    [HttpPost("excel")]
    public async Task<IActionResult> ImportarExcel(
        IFormFile arquivo)
    {
        if (arquivo == null || arquivo.Length == 0)
        {
            return BadRequest(new
            {
                mensagem = "Nenhum arquivo Excel foi enviado."
            });
        }

        var extensao = Path.GetExtension(arquivo.FileName);

        if (!string.Equals(
            extensao,
            ".xlsx",
            StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new
            {
                mensagem = "O arquivo precisa estar no formato .xlsx."
            });
        }

        var caminhoTemporario = Path.Combine(
            Path.GetTempPath(),
            Guid.NewGuid() + ".xlsx"
        );

        try
        {
            await using (var stream = new FileStream(
                caminhoTemporario,
                FileMode.Create,
                FileAccess.Write,
                FileShare.None))
            {
                await arquivo.CopyToAsync(stream);
            }

            var quantidade = await _excelImportService
                .ImportarExcelAsync(caminhoTemporario);

            return Ok(new
            {
                mensagem = "Sincronização concluída com sucesso.",
                arquivo = arquivo.FileName,
                registros = quantidade
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                mensagem = ex.Message
            });
        }
        finally
        {
            if (System.IO.File.Exists(caminhoTemporario))
            {
                System.IO.File.Delete(caminhoTemporario);
            }
        }
    }
}
