using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using System.Text.Json;

namespace TermoTI.API.Controllers;

[ApiController]
[Route("api/cnpj")]
public class CnpjController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;

    public CnpjController(
        IHttpClientFactory httpClientFactory,
        IMemoryCache cache)
    {
        _httpClientFactory = httpClientFactory;
        _cache = cache;
    }

    [HttpGet("{cnpj}")]
    public async Task<IActionResult> Consultar(string cnpj)
    {
        cnpj = new string(cnpj.Where(char.IsDigit).ToArray());

        if (cnpj.Length != 14)
        {
            return BadRequest(new
            {
                erro = "CNPJ inválido."
            });
        }

        var chaveCache = $"razao_social_{cnpj}";

        if (_cache.TryGetValue<string>(
            chaveCache,
            out var razaoSocialCache))
        {
            return Ok(new
            {
                razao_social = razaoSocialCache
            });
        }

        try
        {
            var cliente = _httpClientFactory.CreateClient();
            cliente.Timeout = TimeSpan.FromSeconds(15);

            var resposta = await cliente.GetAsync(
                $"https://brasilapi.com.br/api/cnpj/v1/{cnpj}"
            );

            if (!resposta.IsSuccessStatusCode)
            {
                Console.WriteLine(
                    $"BrasilAPI retornou HTTP {(int)resposta.StatusCode}. Tentando ReceitaWS..."
                );

                using var respostaAlternativa = await cliente.GetAsync(
                    $"https://www.receitaws.com.br/v1/cnpj/{cnpj}"
                );

                if (!respostaAlternativa.IsSuccessStatusCode)
                {
                    return StatusCode(502, new
                    {
                        erro = "Não foi possível consultar o CNPJ em nenhum dos serviços."
                    });
                }

                using var jsonAlternativo = JsonDocument.Parse(
                    await respostaAlternativa.Content.ReadAsStringAsync()
                );

                var raiz = jsonAlternativo.RootElement;

                if (raiz.TryGetProperty("status", out var status) &&
                    status.GetString() == "ERROR")
                {
                    return StatusCode(502, new
                    {
                        erro = "A ReceitaWS não conseguiu consultar o CNPJ."
                    });
                }

                if (!raiz.TryGetProperty("nome", out var campoNome))
                {
                    return StatusCode(502, new
                    {
                        erro = "Razão social não encontrada na ReceitaWS."
                    });
                }

                var razaoSocialAlternativa = campoNome.GetString()?.Trim();

                if (string.IsNullOrWhiteSpace(razaoSocialAlternativa))
                {
                    return StatusCode(502, new
                    {
                        erro = "Razão social não encontrada."
                    });
                }

                _cache.Set(
                    chaveCache,
                    razaoSocialAlternativa,
                    TimeSpan.FromHours(24)
                );

                return Ok(new
                {
                    razao_social = razaoSocialAlternativa
                });
            }

            using var json = JsonDocument.Parse(
                await resposta.Content.ReadAsStringAsync()
            );

            if (!json.RootElement.TryGetProperty(
                "razao_social",
                out var campo))
            {
                return StatusCode(502, new
                {
                    erro = "Razão social não encontrada."
                });
            }

            var razaoSocial = campo.GetString()?.Trim();

            if (string.IsNullOrWhiteSpace(razaoSocial))
            {
                return StatusCode(502, new
                {
                    erro = "Razão social não encontrada."
                });
            }

            _cache.Set(
                chaveCache,
                razaoSocial,
                TimeSpan.FromHours(24)
            );

            return Ok(new
            {
                razao_social = razaoSocial
            });
        }
        catch (HttpRequestException)
        {
            return StatusCode(502, new
            {
                erro = "Serviço de consulta indisponível."
            });
        }
        catch (TaskCanceledException)
        {
            return StatusCode(504, new
            {
                erro = "Tempo limite da consulta excedido."
            });
        }
        catch (JsonException)
        {
            return StatusCode(502, new
            {
                erro = "Resposta inválida do serviço de consulta."
            });
        }
    }
}