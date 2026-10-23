using Microsoft.AspNetCore.Identity;
using TermoTI.API.Models;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using TermoTI.API.Data;
using TermoTI.API.Services;
using TermoTI.API.Middleware;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendLocal", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5500",
                "http://127.0.0.1:5500",
                "http://192.168.100.186:5500"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor |
        ForwardedHeaders.XForwardedProto;
});

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme =
            CookieAuthenticationDefaults.AuthenticationScheme;

        options.DefaultChallengeScheme =
            CookieAuthenticationDefaults.AuthenticationScheme;

        options.DefaultSignInScheme =
            CookieAuthenticationDefaults.AuthenticationScheme;
    })
    .AddCookie(
        CookieAuthenticationDefaults.AuthenticationScheme,
        options =>
        {
            options.Cookie.Name = "termo_ti_admin";
            options.Cookie.HttpOnly = true;
            options.Cookie.SecurePolicy =
                builder.Environment.IsDevelopment()
                    ? CookieSecurePolicy.SameAsRequest
                    : CookieSecurePolicy.Always;
            options.Cookie.SameSite = SameSiteMode.Lax;

            options.ExpireTimeSpan = TimeSpan.FromHours(8);
            options.SlidingExpiration = true;

            options.Events.OnRedirectToLogin = context =>
            {
                context.Response.StatusCode =
                    StatusCodes.Status401Unauthorized;

                return Task.CompletedTask;
            };

            options.Events.OnRedirectToAccessDenied = context =>
            {
                context.Response.StatusCode =
                    StatusCodes.Status403Forbidden;

                return Task.CompletedTask;
            };
        }
    )
    .AddCookie(
        "ColaboradorCookie",
        options =>
        {
            options.Cookie.Name = "termo_ti_colaborador";
            options.Cookie.HttpOnly = true;
            options.Cookie.SecurePolicy =
                builder.Environment.IsDevelopment()
                    ? CookieSecurePolicy.SameAsRequest
                    : CookieSecurePolicy.Always;
            options.Cookie.SameSite = SameSiteMode.Lax;
            options.Cookie.Path = "/";

            options.ExpireTimeSpan = TimeSpan.FromHours(4);
            options.SlidingExpiration = true;

            options.Events.OnRedirectToLogin = context =>
            {
                context.Response.StatusCode =
                    StatusCodes.Status401Unauthorized;

                return Task.CompletedTask;
            };

            options.Events.OnRedirectToAccessDenied = context =>
            {
                context.Response.StatusCode =
                    StatusCodes.Status403Forbidden;

                return Task.CompletedTask;
            };
        }
    );

builder.Services.AddAuthorization();

builder.Services.AddDbContext<TermoTIDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString(
            "DefaultConnection"
        )
    )
);

builder.Services.AddOpenApi();
builder.Services.AddControllers();

builder.Services.AddScoped<ExcelImportService>();

var app = builder.Build();

app.UseForwardedHeaders();

app.UseHttpsRedirection();

app.UseCors("FrontendLocal");

app.UseAuthentication();

app.UseAuthorization();

app.UseMiddleware<AdminAuthMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider
        .GetRequiredService<TermoTIDbContext>();

    await db.Database.MigrateAsync();
}

var adminInicial = builder.Configuration["ADMIN_BOOTSTRAP_USER"];
var senhaInicial = builder.Configuration["ADMIN_BOOTSTRAP_PASSWORD"];

if (!string.IsNullOrWhiteSpace(adminInicial) &&
    !string.IsNullOrWhiteSpace(senhaInicial))
{
    using var scope = app.Services.CreateScope();

    var db = scope.ServiceProvider
        .GetRequiredService<TermoTIDbContext>();

    var adminExiste = await db.UsuariosAdmin.AnyAsync();

    if (!adminExiste)
    {
        var admin = new UsuarioAdmin
        {
            Usuario = adminInicial.Trim(),
            Ativo = true,
            CriadoEm = DateTime.UtcNow
        };

        var hasher = new PasswordHasher<UsuarioAdmin>();

        admin.SenhaHash = hasher.HashPassword(
            admin,
            senhaInicial
        );

        db.UsuariosAdmin.Add(admin);

        await db.SaveChangesAsync();
    }
}

app.Run();
