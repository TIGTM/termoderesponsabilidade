[1mdiff --git a/frontend/colaborador.html b/frontend/colaborador.html[m
[1mindex d40297f..cc05c37 100644[m
[1m--- a/frontend/colaborador.html[m
[1m+++ b/frontend/colaborador.html[m
[36m@@ -35,7 +35,6 @@[m
 [m
     <main class="collaborator-container">[m
 [m
[31m-        <!-- CABEÇALHO -->[m
         <section class="page-header">[m
             <div>[m
                 <h1>Termo de Responsabilidade</h1>[m
[36m@@ -47,7 +46,6 @@[m
             </div>[m
         </section>[m
 [m
[31m-        <!-- IDENTIFICAÇÃO E LOGIN -->[m
         <section class="panel">[m
 [m
             <div class="panel-title">[m
[36m@@ -80,7 +78,6 @@[m
 [m
             </div>[m
 [m
[31m-            <!-- LOGIN DO COLABORADOR -->[m
             <div id="areaLoginColaborador" class="hidden">[m
 [m
                 <div class="form-group">[m
[36m@@ -112,10 +109,8 @@[m
 [m
         </section>[m
 [m
[31m-        <!-- ÁREA LIBERADA APÓS AUTENTICAÇÃO -->[m
         <section id="areaColaborador" class="hidden">[m
 [m
[31m-            <!-- DADOS PESSOAIS -->[m
             <section class="panel">[m
 [m
                 <div class="panel-title">[m
[36m@@ -224,7 +219,6 @@[m
 [m
             </section>[m
 [m
[31m-            <!-- EQUIPAMENTOS -->[m
             <section class="panel">[m
 [m
                 <div class="panel-title">[m
[36m@@ -249,7 +243,6 @@[m
 [m
             </section>[m
 [m
[31m-            <!-- PRÓXIMA ETAPA -->[m
             <section class="panel">[m
 [m
                 <div class="next-step-box">[m
[36m@@ -296,7 +289,6 @@[m
 [m
         </section>[m
 [m
[31m-        <!-- ESTADO INICIAL -->[m
         <section id="estadoVazio" class="empty-state">[m
 [m
             <div class="empty-icon">👤</div>[m
[36m@@ -310,7 +302,6 @@[m
 [m
         </section>[m
 [m
[31m-        <!-- NOTIFICAÇÕES -->[m
         <div[m
             id="toast"[m
             class="toast"[m
[36m@@ -320,12 +311,10 @@[m
 [m
     </main>[m
 [m
[31m-    <!-- BIBLIOTECAS DE PDF -->[m
     <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>[m
 [m
     <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>[m
 [m
[31m-    <!-- LÓGICA DA ÁREA DO COLABORADOR -->[m
     <script src="js/colaborador.js"></script>[m
 [m
 </body>[m
