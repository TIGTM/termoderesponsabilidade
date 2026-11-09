using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TermoTI.API.Data;
using TermoTI.API.DTOs;
using TermoTI.API.Models;
using TermoTI.API.Services;

namespace TermoTI.API.Controllers;

[ApiController]
[Route("api/colaborador-email")]
[Authorize(AuthenticationSchemes = "ColaboradorCookie")]
public class ColaboradorEmailController(TermoTIDbContext context, IEmailAutorizacaoService emailService) : ControllerBase
{
    private const string Finalidade = "ValidarEmail";
    private readonly PasswordHasher<CodigoAutorizacao> hasher = new();

    [HttpGet]
    public async Task<IActionResult> Obter()
    {
        var colaborador = await ObterColaboradorAsync();
        if (colaborador == null) return Unauthorized();
        return Ok(new
        {
            email = colaborador.Email,
            validado = colaborador.EmailValidadoEm != null,
            emailMascarado = MascararEmail(colaborador.Email)
        });
    }

    [HttpPost("solicitar-validacao")]
    public async Task<IActionResult> SolicitarValidacao([FromBody] SolicitarCodigoEmailDto dto)
    {
        var colaborador = await ObterColaboradorAsync();
        if (colaborador == null) return Unauthorized();
        var email = NormalizarEmail(dto.Email);
        if (!EmailAutorizacaoService.EmailValido(email))
            return BadRequest(new { mensagem = "Informe um e-mail válido." });

        var agora = DateTime.UtcNow;
        var ultimo = await context.CodigosAutorizacao
            .Where(c => c.ColaboradorId == colaborador.Id && c.Finalidade == Finalidade && c.UsadoEm == null)
            .OrderByDescending(c => c.CriadoEm).FirstOrDefaultAsync();
        if (ultimo != null && ultimo.CriadoEm > agora.AddSeconds(-60))
            return StatusCode(429, new { mensagem = "Aguarde um minuto antes de pedir outro código." });

        var codigo = GerarCodigo();
        var desafio = new CodigoAutorizacao
        {
            ColaboradorId = colaborador.Id,
            Finalidade = Finalidade,
            Email = email,
            CriadoEm = agora,
            ExpiraEm = agora.AddMinutes(15)
        };
        desafio.CodigoHash = hasher.HashPassword(desafio, codigo);
        context.CodigosAutorizacao.Add(desafio);
        await context.SaveChangesAsync();

        try
        {
            await emailService.EnviarCodigoAsync(email, codigo, "Código para validar seu e-mail", $"Seu código para validar o e-mail no Termo TI é: {codigo}. Ele expira em 15 minutos. Não compartilhe este código.", HttpContext.RequestAborted);
        }
        catch (InvalidOperationException erro)
        {
            desafio.ExpiraEm = agora;
            await context.SaveChangesAsync();
            return StatusCode(503, new { mensagem = erro.Message });
        }

        return Ok(new { mensagem = "Enviamos um código para o e-mail informado.", emailMascarado = MascararEmail(email) });
    }

    [HttpPost("confirmar-validacao")]
    public async Task<IActionResult> ConfirmarValidacao([FromBody] ConfirmarCodigoEmailDto dto)
    {
        var colaborador = await ObterColaboradorAsync();
        if (colaborador == null) return Unauthorized();
        var email = NormalizarEmail(dto.Email);
        var desafio = await ObterDesafioAtivoAsync(colaborador.Id, Finalidade, email, null);
        var falha = await ValidarCodigoAsync(desafio, dto.Codigo);
        if (falha != null) return falha;

        colaborador.Email = email;
        colaborador.EmailValidadoEm = DateTime.UtcNow;
        desafio!.UsadoEm = DateTime.UtcNow;
        await context.SaveChangesAsync();
        return Ok(new { mensagem = "E-mail validado com sucesso.", emailMascarado = MascararEmail(email) });
    }

    private async Task<Colaborador?> ObterColaboradorAsync()
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)) return null;
        return await context.Colaboradores.FirstOrDefaultAsync(c => c.Id == id);
    }

    private async Task<CodigoAutorizacao?> ObterDesafioAtivoAsync(int colaboradorId, string finalidade, string email, int? termoId)
    {
        var agora = DateTime.UtcNow;
        return await context.CodigosAutorizacao.Where(c =>
                c.ColaboradorId == colaboradorId && c.Finalidade == finalidade && c.Email == email &&
                c.TermoId == termoId && c.UsadoEm == null && c.ExpiraEm > agora && c.Tentativas < 5)
            .OrderByDescending(c => c.CriadoEm).FirstOrDefaultAsync();
    }

    private async Task<IActionResult?> ValidarCodigoAsync(CodigoAutorizacao? desafio, string? codigo)
    {
        if (desafio == null) return BadRequest(new { mensagem = "Código inválido, expirado ou já utilizado. Solicite outro código." });
        if (string.IsNullOrWhiteSpace(codigo) || hasher.VerifyHashedPassword(desafio, desafio.CodigoHash, codigo.Trim()) == PasswordVerificationResult.Failed)
        {
            desafio.Tentativas++;
            if (desafio.Tentativas >= 5) desafio.ExpiraEm = DateTime.UtcNow;
            await context.SaveChangesAsync();
            return BadRequest(new { mensagem = "Código inválido. Confira o e-mail e tente novamente." });
        }
        return null;
    }

    public static string GerarCodigo() => RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
    public static string NormalizarEmail(string? email) => (email ?? "").Trim().ToLowerInvariant();
    public static string? MascararEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@')) return null;
        var partes = email.Split('@', 2);
        return $"{partes[0][..1]}***@{partes[1]}";
    }
}
