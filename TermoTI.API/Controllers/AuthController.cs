
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using TermoTI.API.Data;
using TermoTI.API.Models;

namespace TermoTI.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly TermoTIDbContext _context;
    private readonly PasswordHasher<UsuarioAdmin> _passwordHasher = new();

    public AuthController(TermoTIDbContext context)
    {
        _context = context;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Usuario) ||
            string.IsNullOrEmpty(dto.Senha))
        {
            return Unauthorized(new
            {
                mensagem = "Usuário ou senha inválidos."
            });
        }

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

        var hashAntigo = GerarHashLegado(dto.Senha);

        var hashLegadoValido =
            usuario.SenhaHash.Length == 64 &&
            usuario.SenhaHash.All(Uri.IsHexDigit) &&
            CryptographicOperations.FixedTimeEquals(
                Encoding.ASCII.GetBytes(hashAntigo),
                Encoding.ASCII.GetBytes(usuario.SenhaHash.ToUpperInvariant())
            );

        if (hashLegadoValido)
        {
            // Atualiza o hash antigo para o formato seguro do ASP.NET Core.
            usuario.SenhaHash = _passwordHasher.HashPassword(
                usuario,
                dto.Senha
            );

            await _context.SaveChangesAsync();
        }
        else
        {
            var resultado = _passwordHasher.VerifyHashedPassword(
                usuario,
                usuario.SenhaHash,
                dto.Senha
            );

            if (resultado == PasswordVerificationResult.Failed)
            {
                return Unauthorized(new
                {
                    mensagem = "Usuário ou senha inválidos."
                });
            }

            if (resultado == PasswordVerificationResult.SuccessRehashNeeded)
            {
                usuario.SenhaHash = _passwordHasher.HashPassword(
                    usuario,
                    dto.Senha
                );

                await _context.SaveChangesAsync();
            }
        }

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new Claim(ClaimTypes.Name, usuario.Usuario),
            new Claim(ClaimTypes.Role, "Admin")
        };

        var identidade = new ClaimsIdentity(
            claims,
            CookieAuthenticationDefaults.AuthenticationScheme
        );

        var principal = new ClaimsPrincipal(identidade);

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            principal
        );

        return Ok(new
        {
            mensagem = "Login realizado com sucesso."
        });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(
            CookieAuthenticationDefaults.AuthenticationScheme
        );

        return Ok(new
        {
            mensagem = "Logout realizado com sucesso."
        });
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        if (User.Identity?.IsAuthenticated != true)
        {
            return Unauthorized();
        }

        var usuarioIdTexto = User.FindFirstValue(
            ClaimTypes.NameIdentifier
        );

        if (!int.TryParse(usuarioIdTexto, out var usuarioId))
        {
            return Unauthorized();
        }

        var usuario = await _context.UsuariosAdmin
            .AsNoTracking()
            .FirstOrDefaultAsync(x =>
                x.Id == usuarioId &&
                x.Ativo
            );

        if (usuario == null)
        {
            await HttpContext.SignOutAsync(
                CookieAuthenticationDefaults.AuthenticationScheme
            );

            return Unauthorized();
        }

        return Ok(new
        {
            usuario.Id,
            usuario.Usuario
        });
    }

    private static string GerarHashLegado(string senha)
    {
        using var sha256 = SHA256.Create();

        var bytes = Encoding.UTF8.GetBytes(senha);
        var hash = sha256.ComputeHash(bytes);

        return Convert.ToHexString(hash);
    }

    [HttpGet("admin-test")]
    public IActionResult AdminTest()
    {
        if (User.Identity?.IsAuthenticated != true ||
            !User.IsInRole("Admin"))
        {
            return Unauthorized(new
            {
                mensagem = "Acesso não autorizado."
            });
        }

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
