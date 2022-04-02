describe('rounds', () => {
  const username = Cypress.env('USERNAME')
  const password = Cypress.env('PASSWORD')

  it('successfully loads', () => {
    cy.visit('/rounds', {
      auth: {
        username,
        password,
      },
    })

    cy.get('nav .active a').should('contain', 'rounds')
  })
})
