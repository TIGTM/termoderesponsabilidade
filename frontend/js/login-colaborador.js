(() => {
    if (new URLSearchParams(location.search).get("perfil") !== "colaborador") return;
    document.getElementById("loginForm").classList.add("hidden");
    const form = document.getElementById("acessoColaborador");
    form.classList.remove("hidden");
    document.querySelector(".login-subtitle").textContent = "Informe seu nome completo e CPF para acessar seu termo.";
    const nome = document.getElementById("nomeCompleto");
    const cpf = document.getElementById("cpfLogin");
    const senha = document.getElementById("senhaPessoal");
    const confirmacao = document.getElementById("confirmarSenha");
    const mensagem = document.getElementById("mensagemColaborador");
    const botao = document.getElementById("continuarLogin");
    const alterar = document.getElementById("alterarIdentificacao");
    let cadastrado = null;
    let ocupado = false;
    cpf.addEventListener("input", () => {
        cpf.value = cpf.value.replace(/\D/g, "").slice(0, 11)
            .replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
    });
    alterar.addEventListener("click", () => {
        cadastrado = null;
        nome.readOnly = cpf.readOnly = false;
        senha.value = confirmacao.value = "";
        document.getElementById("etapaSenha").classList.add("hidden");
        alterar.classList.add("hidden");
        mensagem.textContent = "";
        botao.textContent = "Continuar";
        nome.focus();
    });
    document.getElementById("mostrarSenha").addEventListener("click", event => {
        const mostrar = senha.type === "password";
        senha.type = confirmacao.type = mostrar ? "text" : "password";
        event.currentTarget.textContent = mostrar ? "Ocultar senha" : "Mostrar senha";
        event.currentTarget.setAttribute("aria-pressed", String(mostrar));
    });
    function erroCampo(campo, texto) {
        campo.setAttribute("aria-invalid", "true");
        campo.focus();
        mensagem.textContent = texto;
    }
    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (ocupado) return;
        [nome, cpf, senha, confirmacao].forEach(c => c.removeAttribute("aria-invalid"));
        mensagem.textContent = "";
        if (nome.value.trim().split(/\s+/).length < 2) return erroCampo(nome, "Informe seu nome completo.");
        if (cpf.value.replace(/\D/g, "").length !== 11) return erroCampo(cpf, "Informe um CPF com 11 dígitos.");
        if (cadastrado !== null && (!senha.value || (!cadastrado && senha.value.length < 8)))
            return erroCampo(senha, cadastrado ? "Informe sua senha." : "Crie uma senha de pelo menos 8 caracteres.");
        if (cadastrado === false && senha.value !== confirmacao.value)
            return erroCampo(confirmacao, "As senhas precisam ser iguais.");
        ocupado = true;
        botao.disabled = alterar.disabled = true;
        form.setAttribute("aria-busy", "true");
        nome.readOnly = cpf.readOnly = true;
        mensagem.textContent = "Aguarde...";
        try {
            const endpoint = cadastrado === null ? "identificar" : cadastrado ? "login" : "cadastrar";
            const resposta = await fetch(`/api/colaborador-auth/${endpoint}`, {
                method: "POST", credentials: "include", signal: AbortSignal.timeout(20000),
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nomeCompleto: nome.value.trim(), cpf: cpf.value, ...(cadastrado !== null ? { senha: senha.value } : {}) })
            });
            const dados = await resposta.json().catch(() => ({}));
            if (!resposta.ok) throw new Error(dados.mensagem || "Não foi possível continuar. Tente novamente.");
            mensagem.textContent = "";
            if (cadastrado === null) {
                cadastrado = dados.cadastrado;
                document.getElementById("etapaSenha").classList.remove("hidden");
                document.getElementById("confirmacaoSenha").classList.toggle("hidden", cadastrado);
                document.getElementById("orientacaoSenha").textContent = cadastrado
                    ? "Digite a senha que você criou." : "Primeiro acesso: crie sua senha com pelo menos 8 caracteres.";
                senha.autocomplete = cadastrado ? "current-password" : "new-password";
                botao.textContent = cadastrado ? "Entrar" : "Criar senha e entrar";
                alterar.classList.remove("hidden");
                senha.focus();
            } else {
                sessionStorage.removeItem("colaboradorTermo");
                location.href = "colaborador.html";
            }
        } catch (erro) {
            mensagem.textContent = erro.name === "TimeoutError"
                ? "A resposta demorou. Tente novamente; se já criou a senha, volte e entre com ela."
                : erro.message || "Verifique sua conexão e tente novamente.";
        } finally {
            ocupado = false;
            botao.disabled = alterar.disabled = false;
            form.removeAttribute("aria-busy");
            if (cadastrado === null) nome.readOnly = cpf.readOnly = false;
        }
    });
})();
