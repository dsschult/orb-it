describe('home page', () => {
  const username = Cypress.env('USERNAME')
  const password = Cypress.env('PASSWORD')

  it('without authorization gets 401', () => {
    cy.request({
      url: '/',
      failOnStatusCode: false,
    }).its('status').should('equal', 401)
  })

  it('successfully loads', () => {
    cy.visit('/', {
      auth: {
        username,
        password,
      },
    })

    cy.get('nav .active a').should('contain', 'home')
  })
})
