using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TermoTI.API.Data;

namespace TermoTI.API.Controllers;

[ApiController]
[Route("api/colaborador-auth")]
public class ColaboradorAuthController : ControllerBase
{
    private const string Scheme = "ColaboradorCookie";

    private readonly IConfiguration _configuration;
    private readonly TermoTIDbContext _context;
    private readonly ILogger<ColaboradorAuthController> _logger;

    public ColaboradorAuthController(
        IConfiguration configuration,
        TermoTIDbContext context,
        ILogger<ColaboradorAuthController> logger)
    {
        _configuration = configuration;
        _context = context;
        _logger = logger;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromBody] LoginColaboradorDto dto)
    {
        if (dto.ColaboradorId <= 0 ||
            string.IsNullOrWhiteSpace(dto.Senha))
        {
            return BadRequest(new
            {
                mensagem = "Informe o colaborador e a senha."
            });
        }

        var senhaConfigurada =
            _configuration["TermoTI:ColaboradorSenha"];

        if (string.IsNullOrWhiteSpace(senhaConfigurada))
        {
            _logger.LogError(
                "A configuração TermoTI:ColaboradorSenha não foi encontrada.");

            return StatusCode(500, new
            {
                mensagem =
                    "A senha de acesso dos colaboradores não está configurada."
            });
        }

        if (!string.Equals(
                dto.Senha,
                senhaConfigurada,
                StringComparison.Ordinal))
        {
            return Unauthorized(new
            {
                mensagem = "Senha incorreta."
            });
        }

        bool colaboradorExiste;

        try
        {
            colaboradorExiste = await _context.Colaboradores
                .AsNoTracking()
                .AnyAsync(c => c.Id == dto.ColaboradorId);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Erro ao consultar o colaborador durante o login.");

            return StatusCode(500, new
            {
                mensagem =
                    "Não foi possível validar o colaborador. Consulte o log da API."
            });
        }

        if (!colaboradorExiste)
        {
            _logger.LogWarning(
                "Login recusado: o ID {ColaboradorId} não foi encontrado na tabela de colaboradores.",
                dto.ColaboradorId);

            return Unauthorized(new
            {
                mensagem =
                    "Colaborador não encontrado na base consultada pela autenticação."
            });
        }

        var claims = new List<Claim>
        {
            new(
                ClaimTypes.NameIdentifier,
                dto.ColaboradorId.ToString()),

            new(
                ClaimTypes.Role,
                "Colaborador")
        };

        var identity = new ClaimsIdentity(claims, Scheme);
        var principal = new ClaimsPrincipal(identity);

        await HttpContext.SignInAsync(
            Scheme,
            principal,
            new AuthenticationProperties
            {
                IsPersistent = false,
                AllowRefresh = true,
                ExpiresUtc = DateTimeOffset.UtcNow.AddHours(4)
            });

        return Ok(new
        {
            mensagem = "Login realizado com sucesso."
        });
    }

    [Authorize(AuthenticationSchemes = Scheme)]
    [HttpGet("me")]
    public IActionResult Me()
    {
        var id = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (!int.TryParse(id, out var colaboradorId))
        {
            return Unauthorized();
        }

        return Ok(new
        {
            colaboradorId
        });
    }

    [Authorize(AuthenticationSchemes = Scheme)]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(Scheme);

        return Ok(new
        {
            mensagem = "Sessão encerrada."
        });
    }
}

public class LoginColaboradorDto
{
    public int ColaboradorId { get; set; }

    public string Senha { get; set; } = string.Empty;
}