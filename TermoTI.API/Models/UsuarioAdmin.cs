namespace TermoTI.API.Models;

public class UsuarioAdmin
{
    public int Id { get; set; }

    public string Usuario { get; set; } = string.Empty;

    public string SenhaHash { get; set; } = string.Empty;

    public bool Ativo { get; set; } = true;

    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
}