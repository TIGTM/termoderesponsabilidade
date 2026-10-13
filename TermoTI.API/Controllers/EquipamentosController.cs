using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TermoTI.API.Data;
using TermoTI.API.Models;

namespace TermoTI.API.Controllers;

[ApiController]
[Route("api/admin/[controller]")]
public class EquipamentosController : ControllerBase
{
    private readonly TermoTIDbContext _context;

    public EquipamentosController(TermoTIDbContext context)
    {
        _context = context;
    }

    [HttpGet("/api/equipamentos")]
    public async Task<ActionResult<IEnumerable<Equipamento>>> GetEquipamentos()
    {
        return await _context.Equipamentos.ToListAsync();
    }

    [HttpGet("/api/admin/equipamentos")]
    public async Task<ActionResult<IEnumerable<Equipamento>>> GetEquipamentosAdmin()
    {
        return await _context.Equipamentos.ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Equipamento>> GetEquipamento(int id)
    {
        var equipamento = await _context.Equipamentos.FindAsync(id);

        if (equipamento == null)
        {
            return NotFound();
        }

        return equipamento;
    }

    [HttpPost]
    public async Task<ActionResult<Equipamento>> CriarEquipamento(
        Equipamento equipamento)
    {
        _context.Equipamentos.Add(equipamento);
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetEquipamento),
            new { id = equipamento.Id },
            equipamento
        );
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> AtualizarEquipamento(
        int id,
        Equipamento equipamento)
    {
        if (id != equipamento.Id)
        {
            return BadRequest();
        }

        _context.Entry(equipamento).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!await _context.Equipamentos.AnyAsync(e => e.Id == id))
            {
                return NotFound();
            }

            throw;
        }

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> ExcluirEquipamento(int id)
    {
        var equipamento = await _context.Equipamentos.FindAsync(id);

        if (equipamento == null)
        {
            return NotFound();
        }

        var possuiTermo = await _context.TermoItens
            .AnyAsync(ti => ti.EquipamentoId == id);

        if (possuiTermo)
        {
            return Conflict(new
            {
                mensagem = "Não é possível excluir este equipamento porque ele está vinculado a um termo."
            });
        }

        _context.Equipamentos.Remove(equipamento);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}