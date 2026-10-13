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

window.adminAutenticado =
    verificarAutenticacaoAdmin();