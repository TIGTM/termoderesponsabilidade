using Microsoft.EntityFrameworkCore;
using TermoTI.API.Models;

namespace TermoTI.API.Data;

public class TermoTIDbContext : DbContext
{
    public TermoTIDbContext(DbContextOptions<TermoTIDbContext> options)
        : base(options)
    {
    }

    public DbSet<Colaborador> Colaboradores { get; set; }

    public DbSet<UsuarioAdmin> UsuariosAdmin { get; set; }

    public DbSet<Equipamento> Equipamentos { get; set; }

    public DbSet<Termo> Termos { get; set; }

    public DbSet<TermoItem> TermoItens { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Colaborador → Termos
        modelBuilder.Entity<Termo>()
            .HasOne<Colaborador>()
            .WithMany()
            .HasForeignKey(t => t.ColaboradorId)
            .OnDelete(DeleteBehavior.Restrict);

        // Termo → Itens
        modelBuilder.Entity<TermoItem>()
            .HasOne<Termo>()
            .WithMany()
            .HasForeignKey(ti => ti.TermoId)
            .OnDelete(DeleteBehavior.Cascade);

        // Equipamento → Itens
        modelBuilder.Entity<TermoItem>()
            .HasOne<Equipamento>()
            .WithMany()
            .HasForeignKey(ti => ti.EquipamentoId)
            .OnDelete(DeleteBehavior.Restrict);

        // Equipamento → Responsável
        modelBuilder.Entity<Equipamento>()
            .HasOne<Colaborador>()
            .WithMany()
            .HasForeignKey(e => e.ResponsavelId)
            .OnDelete(DeleteBehavior.SetNull);

        // Valor monetário
        modelBuilder.Entity<Equipamento>()
            .Property(e => e.Valor)
            .HasPrecision(18, 2);

        // Localização da assinatura
        modelBuilder.Entity<Termo>()
            .Property(t => t.Latitude)
            .HasPrecision(10, 7);

        modelBuilder.Entity<Termo>()
            .Property(t => t.Longitude)
            .HasPrecision(10, 7);

        modelBuilder.Entity<Termo>()
            .Property(t => t.PrecisaoLocalizacao)
            .HasPrecision(10, 2);
    }
}