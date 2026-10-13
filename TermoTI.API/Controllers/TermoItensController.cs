using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TermoTI.API.Data;
using TermoTI.API.Models;

namespace TermoTI.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TermoItensController : ControllerBase
{
    private readonly TermoTIDbContext _context;

    public TermoItensController(TermoTIDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TermoItem>>> GetTermoItens()
    {
        return await _context.TermoItens.ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TermoItem>> GetTermoItem(int id)
    {
        var item = await _context.TermoItens.FindAsync(id);

        if (item == null)
            return NotFound();

        return item;
    }

    [HttpPost]
    public async Task<ActionResult<TermoItem>> CriarTermoItem(TermoItem item)
    {
        _context.TermoItens.Add(item);
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetTermoItem),
            new { id = item.Id },
            item
        );
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> AtualizarTermoItem(
        int id,
        TermoItem item)
    {
        if (id != item.Id)
            return BadRequest();

        _context.Entry(item).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!await _context.TermoItens.AnyAsync(i => i.Id == id))
                return NotFound();

            throw;
        }

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> ExcluirTermoItem(int id)
    {
        var item = await _context.TermoItens.FindAsync(id);

        if (item == null)
            return NotFound();

        _context.TermoItens.Remove(item);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("/api/admin/termos/{id}")]
    public async Task<IActionResult> ExcluirTermoAdmin(int id)
    {
        var termo = await _context.Termos.FindAsync(id);

        if (termo == null)
        {
            return NotFound();
        }

        _context.Termos.Remove(termo);

        await _context.SaveChangesAsync();

        return NoContent();
    }

}

