using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TermoTI.API.Data;
using TermoTI.API.Models;

namespace TermoTI.API.Controllers;

[ApiController]
[Route("api/admin/[controller]")]
public class EquipamentosController : ControllerBase
{
    private const string ColaboradorScheme = "ColaboradorCookie";

    private readonly TermoTIDbContext _context;

    public EquipamentosController(TermoTIDbContext context)
    {
        _context = context;
    }

    [Authorize(AuthenticationSchemes = ColaboradorScheme)]
    [HttpGet("/api/equipamentos")]
    public async Task<ActionResult> GetEquipamentos()
    {
        var claimId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!int.TryParse(claimId, out var colaboradorId)
            || colaboradorId <= 0)
        {
            return Unauthorized();
        }

        var equipamentos = await _context.Equipamentos
            .AsNoTracking()
            .Where(e =>
                e.ResponsavelId == null ||
                e.ResponsavelId == colaboradorId)
            .Select(e => new
            {
                id = e.Id,
                patrimonio = e.Patrimonio,
                categoria = e.Categoria,
                tipo = e.Tipo,
                marca = e.Marca,
                modelo = e.Modelo,
                serial = e.Serial,
                status = e.Status,
                local = e.Local,
                setor = e.Setor
            })
            .ToListAsync();

        return Ok(equipamentos);
    }

    [Authorize]
    [HttpGet("/api/admin/equipamentos")]
    public async Task<ActionResult<IEnumerable<Equipamento>>>
        GetEquipamentosAdmin()
    {
        return await _context.Equipamentos
            .AsNoTracking()
            .ToListAsync();
    }

    [Authorize]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<Equipamento>> GetEquipamento(int id)
    {
        var equipamento = await _context.Equipamentos
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == id);

        if (equipamento == null)
        {
            return NotFound(new
            {
                mensagem = "Equipamento não encontrado."
            });
        }

        return Ok(equipamento);
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<Equipamento>> CriarEquipamento(
        [FromBody] Equipamento equipamento)
    {
        equipamento.Id = 0;

        _context.Equipamentos.Add(equipamento);
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetEquipamento),
            new { id = equipamento.Id },
            equipamento
        );
    }

    [Authorize]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> AtualizarEquipamento(
        int id,
        [FromBody] Equipamento equipamento)
    {
        if (id != equipamento.Id)
        {
            return BadRequest(new
            {
                mensagem = "O ID informado na URL é diferente do ID do equipamento."
            });
        }

        var existente = await _context.Equipamentos
            .FirstOrDefaultAsync(e => e.Id == id);

        if (existente == null)
        {
            return NotFound(new
            {
                mensagem = "Equipamento não encontrado."
            });
        }

        existente.Patrimonio = equipamento.Patrimonio;
        existente.Categoria = equipamento.Categoria;
        existente.Tipo = equipamento.Tipo;
        existente.Marca = equipamento.Marca;
        existente.Modelo = equipamento.Modelo;
        existente.Serial = equipamento.Serial;
        existente.Status = equipamento.Status;
        existente.Local = equipamento.Local;
        existente.Setor = equipamento.Setor;
        existente.ResponsavelId = equipamento.ResponsavelId;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [Authorize]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> ExcluirEquipamento(int id)
    {
        var equipamento = await _context.Equipamentos
            .FirstOrDefaultAsync(e => e.Id == id);

        if (equipamento == null)
        {
            return NotFound(new
            {
                mensagem = "Equipamento não encontrado."
            });
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