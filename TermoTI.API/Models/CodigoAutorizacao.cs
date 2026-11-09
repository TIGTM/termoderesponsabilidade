namespace TermoTI.API.Models;

public class CodigoAutorizacao
{
    public int Id { get; set; }
    public int ColaboradorId { get; set; }
    public int? TermoId { get; set; }
    public string Finalidade { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string CodigoHash { get; set; } = string.Empty;
    public string? DocumentoHash { get; set; }
    public DateTime CriadoEm { get; set; }
    public DateTime ExpiraEm { get; set; }
    public DateTime? ConfirmadoEm { get; set; }
    public DateTime? UsadoEm { get; set; }
    public int Tentativas { get; set; }

    [System.ComponentModel.DataAnnotations.Timestamp]
    public byte[] Versao { get; set; } = Array.Empty<byte>();
}
