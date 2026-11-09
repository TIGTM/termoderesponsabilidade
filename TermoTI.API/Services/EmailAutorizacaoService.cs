using System.ComponentModel.DataAnnotations;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;

namespace TermoTI.API.Services;

public interface IEmailAutorizacaoService
{
    Task EnviarCodigoAsync(string destinatario, string codigo, string assunto, string mensagem, CancellationToken cancellationToken);
}

public class EmailAutorizacaoService(
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IMemoryCache cache,
    ILogger<EmailAutorizacaoService> logger) : IEmailAutorizacaoService
{
    public static bool EmailValido(string? email) =>
        !string.IsNullOrWhiteSpace(email) && email.Length <= 254 &&
        new EmailAddressAttribute().IsValid(email);

    public async Task EnviarCodigoAsync(string destinatario, string codigo, string assunto, string mensagem, CancellationToken cancellationToken)
    {
        var tenantId = configuration["MicrosoftGraph:TenantId"];
        var clientId = configuration["MicrosoftGraph:ClientId"];
        var clientSecret = configuration["MicrosoftGraph:ClientSecret"];
        var remetente = configuration["MicrosoftGraph:Sender"];
        if (new[] { tenantId, clientId, clientSecret, remetente }.Any(string.IsNullOrWhiteSpace))
            throw new InvalidOperationException("O envio de e-mail ainda não foi configurado pelo TI.");

        var token = await ObterTokenAsync(tenantId!, clientId!, clientSecret!, cancellationToken);
        var client = httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var payload = new
        {
            message = new
            {
                subject = assunto,
                body = new { contentType = "Text", content = mensagem },
                toRecipients = new[] { new { emailAddress = new { address = destinatario } } }
            },
            saveToSentItems = true
        };
        using var resposta = await client.PostAsync(
            $"https://graph.microsoft.com/v1.0/users/{Uri.EscapeDataString(remetente!)}/sendMail",
            new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"), cancellationToken);
        if (!resposta.IsSuccessStatusCode)
        {
            logger.LogError("Microsoft Graph recusou o envio de código. HTTP {StatusCode}.", (int)resposta.StatusCode);
            throw new InvalidOperationException("Não foi possível enviar o código por e-mail. Tente novamente em alguns minutos.");
        }
    }
    
    private async Task<string> ObterTokenAsync(string tenantId, string clientId, string clientSecret, CancellationToken cancellationToken)
    {
        const string cacheKey = "microsoft-graph-app-token";
        if (cache.TryGetValue(cacheKey, out string? token) && !string.IsNullOrWhiteSpace(token)) return token;
        var client = httpClientFactory.CreateClient();
        using var resposta = await client.PostAsync(
            $"https://login.microsoftonline.com/{Uri.EscapeDataString(tenantId)}/oauth2/v2.0/token",
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["client_id"] = clientId,
                ["client_secret"] = clientSecret,
                ["scope"] = "https://graph.microsoft.com/.default",
                ["grant_type"] = "client_credentials"
            }), cancellationToken);
        if (!resposta.IsSuccessStatusCode)
        {
            logger.LogError("Não foi possível obter token do Microsoft Graph. HTTP {StatusCode}.", (int)resposta.StatusCode);
            throw new InvalidOperationException("O envio de e-mail ainda não está disponível. Procure o TI.");
        }
        using var dados = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync(cancellationToken));
        token = dados.RootElement.GetProperty("access_token").GetString();
        var expiraEm = dados.RootElement.GetProperty("expires_in").GetInt32();
        if (string.IsNullOrWhiteSpace(token)) throw new InvalidOperationException("O envio de e-mail ainda não está disponível. Procure o TI.");
        cache.Set(cacheKey, token, TimeSpan.FromSeconds(Math.Max(60, expiraEm - 120)));
        return token;
    }
}
