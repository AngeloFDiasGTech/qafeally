const { defineConfig } = require("cypress");
const cucumber = require("cypress-cucumber-preprocessor").default;
const { OpenAI } = require("openai");
const fs = require("fs");
const path = require("path");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:8080",
    specPattern: "**/*.feature",
    video: false,
    setupNodeEvents(on, config) {
      // Preprocessor do Cucumber (BDD)
      on("file:preprocessor", cucumber());

      // Task de Auditoria Dinâmica com IA (OpenAI GPT-4o) no backend Node.js
      on("task", {
        async auditarComOpenAI({ html, css }) {
          const apiKey = process.env.OPENAI_API_KEY || config.env.OPENAI_API_KEY;
          const reportDir = path.join(__dirname, "cypress", "reports");

          if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
          }

          if (!apiKey) {
            const msgErro =
              "[VIOLAÇÃO CRÍTICA] Variável de ambiente OPENAI_API_KEY não configurada. Configure a secret OPENAI_API_KEY no GitHub Actions ou localmente.";
            fs.writeFileSync(path.join(reportDir, "a11y-report.md"), msgErro, "utf8");
            return msgErro;
          }

          const openai = new OpenAI({ apiKey });

          const systemPrompt = `Atue como um Auditor Sênior de Acessibilidade Digital (WCAG 2.2 níveis A e AA) em uma esteira de CI/CD (Quality Gate).
Você receberá o HTML renderizado e o CSS da aplicação "QAfé Academy".

Sua missão é auditar rigorosamente o código procurando por falhas críticas de acessibilidade, tais como:
1. Elementos interativos (links <a>, botões <button>) sem nome acessível ou cujo texto esteja oculto para leitores de tela (ex: texto dentro de <span aria-hidden="true"> sem aria-label no elemento pai).
2. Campos de formulário (<input>) sem <label for="..."> correspondente ou sem rotulagem acessível (aria-label / aria-labelledby).
3. Imagens (<img>) informativas sem atributo alt.
4. Ausência de semântica estrutural ou remoção deliberada de indicador de foco visível (outline: none sem substituto em :focus-visible).
5. Problemas severos de contraste ou bloqueio de navegação por teclado (ex: tabindex negativo em links/botões ativos).

REGRAS ESTRITAS DE RESPOSTA:
- Se encontrar QUALQUER violação crítica, inicie sua resposta OBRIGATORIAMENTE com a tag exata: [VIOLAÇÃO CRÍTICA]
  Em seguida, gere um relatório em Markdown contendo:
  - **Resumo do Veredito:** Reprovado no Quality Gate de Acessibilidade ❌
  - **Violações Encontradas:** Liste cada falha indicando o Critério de Sucesso da WCAG 2.2 violado (ex: WCAG 2.4.4, 4.1.2, 1.3.1, 2.4.7), o trecho de código problemático, o impacto para a pessoa com deficiência (ex: usuário de leitor de tela NVDA/VoiceOver ou navegação por teclado) e a sugestão de correção de código.
- Se o código estiver totalmente acessível e sem violações críticas, inicie sua resposta OBRIGATORIAMENTE com a tag exata: [ACESSÍVEL]
  Em seguida, gere um relatório em Markdown contendo:
  - **Resumo do Veredito:** Aprovado no Quality Gate de Acessibilidade ✅
  - **Pontos Fortes Validados:** Destaque boas práticas presentes no código (ex: Skip Link WCAG 2.4.1, roles ARIA em abas, aria-live no feedback, contraste e foco visível WCAG 2.4.7).`;

          const userPrompt = `Audite o seguinte código renderizado da página:

### HTML Renderizado (<body>):
\`\`\`html
${html}
\`\`\`

${css ? `### CSS Aplicado:\n\`\`\`css\n${css}\n\`\`\`` : ""}`;

          try {
            const response = await openai.chat.completions.create({
              model: "gpt-4o",
              temperature: 0,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
            });

            const laudo = response.choices[0].message.content;

            // Salva o laudo em Markdown e JSON para o GitHub Actions comentar no PR e publicar no Job Summary
            fs.writeFileSync(path.join(reportDir, "a11y-report.md"), laudo, "utf8");
            fs.writeFileSync(
              path.join(reportDir, "a11y-report.json"),
              JSON.stringify(
                {
                  timestamp: new Date().toISOString(),
                  model: "gpt-4o",
                  approved: !laudo.includes("[VIOLAÇÃO CRÍTICA]"),
                  report: laudo,
                },
                null,
                2
              ),
              "utf8"
            );

            console.log("\n================ LAUDO DE ACESSIBILIDADE (IA) ================");
            console.log(laudo);
            console.log("==============================================================\n");

            return laudo;
          } catch (error) {
            console.error("❌ Erro na API da OpenAI:", error);
            const erroMsg = `[VIOLAÇÃO CRÍTICA] Erro ao consultar a API da OpenAI: ${error.message}`;
            fs.writeFileSync(path.join(reportDir, "a11y-report.md"), erroMsg, "utf8");
            return erroMsg;
          }
        },
      });

      return config;
    },
  },
});
