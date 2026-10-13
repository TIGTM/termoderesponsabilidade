using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using TermoTI.API.Data;

namespace TermoTI.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly TermoTIDbContext _context;

    public AuthController(TermoTIDbContext context)
    {
        _context = context;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var usuario = await _context.UsuariosAdmin
            .FirstOrDefaultAsync(x =>
                x.Usuario == dto.Usuario &&
                x.Ativo);

        if (usuario == null)
        {
            return Unauthorized(new
            {
                mensagem = "Usuário ou senha inválidos."
            });
        }

        var senhaHash = GerarHash(dto.Senha);

        if (senhaHash != usuario.SenhaHash)
        {
            return Unauthorized(new
            {
                mensagem = "Usuário ou senha inválidos."
            });
        }

        Response.Cookies.Append(
            "termo_ti_admin",
            usuario.Id.ToString(),
            new CookieOptions
            {
                HttpOnly = true,
                Secure = false,
                SameSite = SameSiteMode.Lax,
                Expires = DateTimeOffset.UtcNow.AddHours(8)
            });

        return Ok(new
        {
            mensagem = "Login realizado com sucesso."
        });
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("termo_ti_admin");

        return Ok(new
        {
            mensagem = "Logout realizado com sucesso."
        });
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        if (!Request.Cookies.TryGetValue(
            "termo_ti_admin",
            out var usuarioIdTexto))
        {
            return Unauthorized();
        }

        if (!int.TryParse(usuarioIdTexto, out var usuarioId))
        {
            return Unauthorized();
        }

        var usuario = await _context.UsuariosAdmin
            .AsNoTracking()
            .FirstOrDefaultAsync(x =>
                x.Id == usuarioId &&
                x.Ativo);

        if (usuario == null)
        {
            return Unauthorized();
        }

        return Ok(new
        {
            usuario.Id,
            usuario.Usuario
        });
    }

    private static string GerarHash(string senha)
    {
        using var sha256 = SHA256.Create();

        var bytes = Encoding.UTF8.GetBytes(senha);
        var hash = sha256.ComputeHash(bytes);

        return Convert.ToHexString(hash);
    }

    [HttpGet("admin-test")]
    public IActionResult AdminTest()
    {
        return Ok(new
        {
            mensagem = "Você está autenticado como administrador."
        });
    }
}

public class LoginDto
{
    public string Usuario { get; set; } = string.Empty;

    public string Senha { get; set; } = string.Empty;
}