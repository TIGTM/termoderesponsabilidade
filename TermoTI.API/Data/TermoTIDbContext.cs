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
    public DbSet<ContaColaborador> ContasColaboradores { get; set; }
    public DbSet<CodigoAutorizacao> CodigosAutorizacao { get; set; }

    public DbSet<UsuarioAdmin> UsuariosAdmin { get; set; }

    public DbSet<Equipamento> Equipamentos { get; set; }

    public DbSet<Termo> Termos { get; set; }

    public DbSet<TermoItem> TermoItens { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ContaColaborador>().Property(c => c.CPF).HasMaxLength(14);
        modelBuilder.Entity<ContaColaborador>().HasIndex(c => c.CPF).IsUnique();
        modelBuilder.Entity<ContaColaborador>().HasIndex(c => c.ColaboradorId).IsUnique();
        modelBuilder.Entity<ContaColaborador>().HasOne<Colaborador>().WithOne()
            .HasForeignKey<ContaColaborador>(c => c.ColaboradorId).OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CodigoAutorizacao>().Property(c => c.Finalidade).HasMaxLength(32);
        modelBuilder.Entity<CodigoAutorizacao>().Property(c => c.Email).HasMaxLength(254);
        modelBuilder.Entity<CodigoAutorizacao>().Property(c => c.DocumentoHash).HasMaxLength(64);
        modelBuilder.Entity<CodigoAutorizacao>().HasIndex(c => new { c.ColaboradorId, c.Finalidade, c.CriadoEm });
        modelBuilder.Entity<CodigoAutorizacao>().HasIndex(c => new { c.TermoId, c.Finalidade, c.CriadoEm });
        modelBuilder.Entity<CodigoAutorizacao>().HasOne<Colaborador>().WithMany()
            .HasForeignKey(c => c.ColaboradorId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<CodigoAutorizacao>().HasOne<Termo>().WithMany()
            .HasForeignKey(c => c.TermoId).OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Termo>()
            .HasOne<Colaborador>()
            .WithMany()
            .HasForeignKey(t => t.ColaboradorId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TermoItem>()
            .HasOne<Termo>()
            .WithMany()
            .HasForeignKey(ti => ti.TermoId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TermoItem>()
            .HasOne<Equipamento>()
            .WithMany()
            .HasForeignKey(ti => ti.EquipamentoId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Equipamento>()
            .HasOne<Colaborador>()
            .WithMany()
            .HasForeignKey(e => e.ResponsavelId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Equipamento>()
            .Property(e => e.Valor)
            .HasPrecision(18, 2);

        modelBuilder.Entity<Termo>()
            .Property(t => t.Latitude)
            .HasPrecision(10, 7);

        modelBuilder.Entity<Termo>()
            .Property(t => t.Longitude)
            .HasPrecision(10, 7);

        modelBuilder.Entity<Termo>()
            .Property(t => t.PrecisaoLocalizacao)
            .HasPrecision(10, 2);

        modelBuilder.Entity<Termo>()
            .Property(t => t.TipoTermo)
            .HasDefaultValue("CPF");
    }
}
