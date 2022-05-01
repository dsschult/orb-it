describe('new_player', () => {
  const username = Cypress.env('USERNAME')
  const password = Cypress.env('PASSWORD')

  it('successfully loads', () => {
    cy.visit('/new_player', {
      auth: {
        username,
        password,
      },
    })

    cy.get('nav .active a').should('contain', 'new player')

    cy.get('input[name=name]').should('exist').type('PlayerNew')
    cy.get('input[name=hcp]').should('exist').type('{selectall}13')
    cy.get('input[name=hcp9]').invoke('val').should('equal', '7')
    cy.get('input[name=hcp9]').type('{selectall}5')
    cy.get('input[name=hcp]').invoke('val').should('equal', '10')
    cy.get('select[name=tee]').should('exist').select('short')
    cy.get('[data-test=submit]').should('exist').click()
  })
})
