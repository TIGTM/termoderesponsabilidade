const API_URL = "http://localhost:5268/api";

const form = document.getElementById("loginForm");
const mensagem = document.getElementById("mensagem");

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    mensagem.textContent = "";

    const usuario = document.getElementById("usuario").value.trim();
    const senha = document.getElementById("senha").value;

    try {
        const resposta = await fetch(
            `${API_URL}/auth/login`,
            {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    usuario,
                    senha
                })
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.mensagem ||
                "Usuário ou senha inválidos."
            );
        }

        window.location.href = "admin.html";
    } catch (erro) {
        mensagem.textContent =
            erro.message ||
            "Não foi possível realizar o login.";
    }
});