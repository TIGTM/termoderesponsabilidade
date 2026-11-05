---
version: alpha
name: Termo TI
description: Portal interno GTM para dados do colaborador e termos de equipamentos.
colors:
  primary: '#1d4ed8'
  background: '#ffffff'
  text: '#1e293b'
  muted: '#64748b'
  danger: '#b91c1c'
typography:
  sans:
    fontFamily: 'Arial, Helvetica, sans-serif'
rounded:
  input: '8px'
  login-card: '18px'
omitted:
  - section: spacing
    reason: Valores existentes por componente em frontend/css/style.css.
  - section: components
    reason: Classes compartilhadas documentadas abaixo.
---
# Termo TI

## Overview
Portal de trabalho para colaboradores brasileiros preencherem e assinarem seus termos. Linguagem pt-BR, direta e institucional. Preservar a marca GTM e a identidade existente; esta alteração não redesenha o painel administrativo.
A assinatura visual é o cartão de acesso com a marca GTM. Formulários priorizam leitura e conclusão da tarefa, sem decoração adicional.
Fonte de verdade visual: frontend/css/style.css; este documento registra os valores existentes, sem geração de CSS.

## Colors
Superfícies brancas, texto escuro, azul para foco e ações da aplicação. Erros têm mensagem textual além da cor. Login preserva o botão escuro existente.

## Typography
Arial em títulos, campos e texto; hierarquia por tamanho e peso, conforme as classes existentes.

## Layout
Login em cartão de até 520px incluindo o contêiner, com adaptação abaixo de 600px e rolagem natural. Cadastro usa os painéis e a grade existentes. Nome e CPF permanecem visíveis durante a etapa de senha.

## Elevation & Depth
Cartão de login com sombra existente. Não adicionar sobreposições ao fluxo de identificação.

## Shapes
Campos com raio de 8px e cartão de login com 18px, conforme stylesheet.

## Components
Donos canônicos: `.login-field`, `.login-button`, `.btn-secondary` e `.hidden` em style.css. Acesso administrativo: login.js; acesso do colaborador: login-colaborador.js; dados e termo: colaborador.js. Identificação e autorização são decididas por ColaboradorAuthController.
Campos têm rótulos, mensagens associadas e foco no erro local. Botões bloqueiam envio duplicado e o formulário anuncia carregamento. Senhas são mascaradas, com controle de exibição. Falhas preservam os dados para correção.

## Do's and Don'ts
Reutilizar estilos do login; preservar entrada administrativa. Não guardar senha no navegador. Não mostrar lista de pessoas na área do colaborador. Ambiguidade de nomes exige revisão do cadastro pelo TI, sem selecionar um candidato arbitrário.
