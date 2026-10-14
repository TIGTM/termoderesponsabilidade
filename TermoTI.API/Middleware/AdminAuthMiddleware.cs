
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TermoTI.API.Data;

namespace TermoTI.API.Middleware;

public class AdminAuthMiddleware
{
    private readonly RequestDelegate _next;

    public AdminAuthMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(
        HttpContext context,
        TermoTIDbContext db)
    {
        if (!context.Request.Path.StartsWithSegments("/api/admin"))
        {
            await _next(context);
            return;
        }

        if (context.User.Identity?.IsAuthenticated != true ||
            !context.User.IsInRole("Admin"))
        {
            await NaoAutorizado(context);
            return;
        }

        var usuarioIdTexto = context.User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (!int.TryParse(usuarioIdTexto, out var usuarioId))
        {
            await NaoAutorizado(context);
            return;
        }

        var usuarioAtivo = await db.UsuariosAdmin
            .AsNoTracking()
            .AnyAsync(x => x.Id == usuarioId && x.Ativo);

        if (!usuarioAtivo)
        {
            await context.SignOutAsync(
                CookieAuthenticationDefaults.AuthenticationScheme);

            await NaoAutorizado(context);
            return;
        }

        await _next(context);
    }

    private static async Task NaoAutorizado(HttpContext context)
    {
        context.Response.StatusCode =
            StatusCodes.Status401Unauthorized;

        await context.Response.WriteAsJsonAsync(new
        {
            mensagem = "Acesso não autorizado."
        });
    }
}