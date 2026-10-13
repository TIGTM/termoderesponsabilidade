using Microsoft.EntityFrameworkCore;
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

        if (!context.Request.Cookies.TryGetValue(
            "termo_ti_admin",
            out var usuarioIdTexto))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new
            {
                mensagem = "Acesso não autorizado."
            });
            return;
        }

        if (!int.TryParse(usuarioIdTexto, out var usuarioId))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new
            {
                mensagem = "Acesso não autorizado."
            });
            return;
        }

        var usuario = await db.UsuariosAdmin
            .AsNoTracking()
            .FirstOrDefaultAsync(x =>
                x.Id == usuarioId &&
                x.Ativo);

        if (usuario == null)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new
            {
                mensagem = "Acesso não autorizado."
            });
            return;
        }

        await _next(context);
    }
}