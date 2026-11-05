using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TermoTI.API.Data;
using TermoTI.API.Models;
using TermoTI.API.Services;

namespace TermoTI.API.Controllers;

[ApiController]
[Route("api/admin/[controller]")]
public class ColaboradoresController : ControllerBase
{
    private const string ColaboradorScheme = "ColaboradorCookie";

    private readonly TermoTIDbContext _context;

    public ColaboradoresController(TermoTIDbContext context)
    {
        _context = context;
    }

    [AllowAnonymous]
    [HttpGet("/api/colaboradores")]
    public async Task<IActionResult> GetColaboradoresPublico()
    {
        var colaboradores = await _context.Colaboradores
            .AsNoTracking()
            .OrderBy(c => c.NomeCompleto)
            .Select(c => new
            {
                id = c.Id,
                nome = c.Nome,
                nomeCompleto = c.NomeCompleto,
                email = c.Email
            })
            .ToListAsync();

        return Ok(colaboradores);
    }

    // Permite ao colaborador autenticado atualizar apenas seus próprios dados.
    [Authorize(AuthenticationSchemes = ColaboradorScheme)]
    [HttpPut("/api/colaboradores/{id:int}")]
    public async Task<IActionResult> AtualizarColaboradorPublico(
        int id,
        [FromBody] Colaborador colaborador)
    {
        var idSessao = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (!int.TryParse(idSessao, out var colaboradorId))
        {
            return Unauthorized(new
            {
                mensagem = "Sessão de colaborador inválida."
            });
        }

        if (id != colaboradorId || id != colaborador.Id)
        {
            return Forbid(ColaboradorScheme);
        }

        var colaboradorExistente = await _context.Colaboradores
            .FirstOrDefaultAsync(c => c.Id == colaboradorId);

        if (colaboradorExistente == null)
        {
            return NotFound(new
            {
                mensagem = "Colaborador não encontrado."
            });
        }

        var conta = await _context.ContasColaboradores.AsNoTracking()
            .SingleOrDefaultAsync(c => c.ColaboradorId == id);
        if (conta != null && IdentidadeColaborador.Cpf(colaborador.CPF) != conta.CPF)
            return BadRequest(new { mensagem = "O CPF deve corresponder ao CPF da sua conta." });

        colaboradorExistente.Nome = colaborador.Nome;
        colaboradorExistente.NomeCompleto = colaborador.NomeCompleto;
        colaboradorExistente.CPF = colaborador.CPF;
        colaboradorExistente.CEP = colaborador.CEP;
        colaboradorExistente.Rua = colaborador.Rua;
        colaboradorExistente.Numero = colaborador.Numero;
        colaboradorExistente.Bairro = colaborador.Bairro;
        colaboradorExistente.Cidade = colaborador.Cidade;
        colaboradorExistente.Estado = colaborador.Estado;
        colaboradorExistente.Telefone = colaborador.Telefone;
        colaboradorExistente.Email = colaborador.Email;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    // Lista completa de colaboradores para o painel administrativo.
    [Authorize]
    [HttpGet("/api/admin/colaboradores")]
    public async Task<ActionResult<IEnumerable<Colaborador>>>
        GetColaboradoresAdmin()
    {
        return await _context.Colaboradores
            .AsNoTracking()
            .OrderBy(c => c.NomeCompleto)
            .ToListAsync();
    }

    [Authorize]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<Colaborador>> GetColaborador(int id)
    {
        var colaborador = await _context.Colaboradores
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);

        if (colaborador == null)
        {
            return NotFound();
        }

        return colaborador;
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<Colaborador>> CriarColaborador(
        [FromBody] Colaborador colaborador)
    {
        _context.Colaboradores.Add(colaborador);

        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetColaborador),
            new { id = colaborador.Id },
            colaborador);
    }

    [Authorize]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> AtualizarColaborador(
        int id,
        [FromBody] Colaborador colaborador)
    {
        if (id != colaborador.Id)
        {
            return BadRequest(new
            {
                mensagem = "O ID da rota não corresponde ao ID do colaborador."
            });
        }

        var colaboradorExistente = await _context.Colaboradores
            .FirstOrDefaultAsync(c => c.Id == id);

        if (colaboradorExistente == null)
        {
            return NotFound();
        }

        colaboradorExistente.Nome = colaborador.Nome;
        colaboradorExistente.NomeCompleto = colaborador.NomeCompleto;
        colaboradorExistente.CPF = colaborador.CPF;
        colaboradorExistente.CEP = colaborador.CEP;
        colaboradorExistente.Rua = colaborador.Rua;
        colaboradorExistente.Numero = colaborador.Numero;
        colaboradorExistente.Bairro = colaborador.Bairro;
        colaboradorExistente.Cidade = colaborador.Cidade;
        colaboradorExistente.Estado = colaborador.Estado;
        colaboradorExistente.Telefone = colaborador.Telefone;
        colaboradorExistente.Email = colaborador.Email;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [Authorize]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> ExcluirColaborador(int id)
    {
        var colaborador = await _context.Colaboradores
            .FirstOrDefaultAsync(c => c.Id == id);

        if (colaborador == null)
        {
            return NotFound();
        }

        _context.Colaboradores.Remove(colaborador);

        await _context.SaveChangesAsync();

        return NoContent();
    }
}
