async function verificarAutenticacaoAdmin() {

    try {

        const resposta = await fetch(
            "http://localhost:5268/api/auth/me",
            {
                method: "GET",
                credentials: "include",
                cache: "no-store"
            }
        );

        if (!resposta.ok) {
            window.location.replace("login.html");
            return false;
        }

        document.body.classList.remove(
            "admin-page-loading"
        );

        return true;

    } catch (erro) {

        console.error(
            "Erro ao verificar autenticação:",
            erro
        );

        window.location.replace("login.html");

        return false;
    }
}

async function logout() {
    try {
        const resposta = await fetch("http://localhost:5268/api/auth/logout", {
            method: "POST",
            credentials: "include"
        });

        if (!resposta.ok) {
            throw new Error("Não foi possível encerrar a sessão.");
        }

        window.location.replace("index.html");
    } catch (erro) {
        console.error("Erro ao fazer logout:", erro);
        alert("Não foi possível sair. Tente novamente.");
    }
}

window.logout = logout;

window.adminAutenticado =
    verificarAutenticacaoAdmin();