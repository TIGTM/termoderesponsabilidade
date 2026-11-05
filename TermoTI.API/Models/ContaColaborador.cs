using System.Text.Json.Serialization;

namespace TermoTI.API.Models;

public class ContaColaborador
{
    public int Id { get; set; }
    public int ColaboradorId { get; set; }
    public string CPF { get; set; } = string.Empty;
    [JsonIgnore]
    public string SenhaHash { get; set; } = string.Empty;
}
