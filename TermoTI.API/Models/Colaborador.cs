namespace TermoTI.API.Models;

public class Colaborador
{
    public int Id { get; set; }

    public string Nome { get; set; } = string.Empty;

    public string NomeCompleto { get; set; } = string.Empty;

    public string? CPF { get; set; }

    public string? CEP { get; set; }

    public string? Rua { get; set; }

    public string? Numero { get; set; }

    public string? Bairro { get; set; }

    public string? Cidade { get; set; }

    public string? Estado { get; set; }

    public string? Telefone { get; set; }

    public string? Email { get; set; }
}