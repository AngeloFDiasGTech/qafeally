/// <reference types="cypress" />

import { Given, When, Then, And } from "cypress-cucumber-preprocessor/steps";

let relatorioA11y = "";

Given("que eu acesso a página de login da QAfé Academy", () => {
  const targetUrl = Cypress.env("URL_DO_PR") || "/";
  cy.visit(targetUrl);
});

And("os marcos estruturais e elementos essenciais de acessibilidade estão presentes", () => {
  // Valida idioma da página (WCAG 3.1.1)
  cy.get("html").should("have.attr", "lang", "pt-BR");

  // Valida Skip Link (WCAG 2.4.1 Bypass Blocks)
  cy.get("a.skip-link")
    .should("exist")
    .and("have.attr", "href", "#conteudo-principal");

  // Valida landmark principal e título H1
  cy.get("main#conteudo-principal").should("exist");
  cy.get("h1#titulo-login").should("be.visible");

  // Valida região de feedback com aria-live (WCAG 4.1.3 Status Messages)
  cy.get("#auth-feedback")
    .should("have.attr", "role", "alert")
    .and("have.attr", "aria-live", "polite");
});

When("eu solicito a auditoria dinâmica de acessibilidade via OpenAI", () => {
  cy.document().then((doc) => {
    const htmlExtraido = doc.body.outerHTML;

    // Captura também as regras CSS carregadas para permitir análise de foco visível e estilos
    let cssExtraido = "";
    try {
      for (const sheet of Array.from(doc.styleSheets)) {
        if (sheet.href && sheet.href.includes("index.css")) {
          const rules = Array.from(sheet.cssRules || []);
          cssExtraido = rules.map((r) => r.cssText).join("\n");
        }
      }
    } catch (e) {
      // Ignora folhas de estilo cross-origin (como Google Fonts)
    }

    cy.task("auditarComOpenAI", { html: htmlExtraido, css: cssExtraido }, { timeout: 60000 }).then(
      (resposta) => {
        expect(resposta, "A resposta da OpenAI não pode ser nula").to.not.be.null;
        cy.log(resposta);
        relatorioA11y = resposta;
      }
    );
  });
});

Then("a inteligência artificial deve aprovar a página sem relatar violações críticas", () => {
  // Se a IA encontrou "[VIOLAÇÃO CRÍTICA]", o teste falha e exibe o laudo completo no erro do Cypress
  expect(
    relatorioA11y,
    `Laudo da IA reprovou o Pull Request:\n\n${relatorioA11y}\n`
  ).to.not.include("[VIOLAÇÃO CRÍTICA]");

  expect(relatorioA11y).to.include("[ACESSÍVEL]");
});
