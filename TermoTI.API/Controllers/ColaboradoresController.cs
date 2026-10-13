using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TermoTI.API.Data;
using TermoTI.API.Models;

namespace TermoTI.API.Controllers;

[ApiController]
[Route("api/admin/[controller]")]
public class ColaboradoresController : ControllerBase
{
    private readonly TermoTIDbContext _context;

    public ColaboradoresController(TermoTIDbContext context)
    {
        _context = context;
    }

    // =========================================================
    // ROTAS PÚBLICAS
    // =========================================================

    [HttpGet("/api/colaboradores")]
    public async Task<ActionResult<IEnumerable<Colaborador>>> GetColaboradoresPublico()
    {
        return await _context.Colaboradores
            .AsNoTracking()
            .ToListAsync();
    }

    [HttpPut("/api/colaboradores/{id}")]
    public async Task<IActionResult> AtualizarColaboradorPublico(
        int id,
        Colaborador colaborador)
    {
        if (id != colaborador.Id)
        {
            return BadRequest();
        }

        var colaboradorExistente =
            await _context.Colaboradores.FindAsync(id);

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

    // =========================================================
    // ROTAS ADMINISTRATIVAS
    // =========================================================

    [HttpGet("/api/admin/colaboradores")]
    public async Task<ActionResult<IEnumerable<Colaborador>>> GetColaboradoresAdmin()
    {
        return await _context.Colaboradores
            .AsNoTracking()
            .ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Colaborador>> GetColaborador(int id)
    {
        var colaborador =
            await _context.Colaboradores.FindAsync(id);

        if (colaborador == null)
        {
            return NotFound();
        }

        return colaborador;
    }

    [HttpPost]
    public async Task<ActionResult<Colaborador>> CriarColaborador(
        Colaborador colaborador)
    {
        _context.Colaboradores.Add(colaborador);

        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetColaborador),
            new { id = colaborador.Id },
            colaborador
        );
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> AtualizarColaborador(
        int id,
        Colaborador colaborador)
    {
        if (id != colaborador.Id)
        {
            return BadRequest();
        }

        _context.Entry(colaborador).State =
            EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!await _context.Colaboradores.AnyAsync(c => c.Id == id))
            {
                return NotFound();
            }

            throw;
        }

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> ExcluirColaborador(int id)
    {
        var colaborador =
            await _context.Colaboradores.FindAsync(id);

        if (colaborador == null)
        {
            return NotFound();
        }

        _context.Colaboradores.Remove(colaborador);

        await _context.SaveChangesAsync();

        return NoContent();
    }
}