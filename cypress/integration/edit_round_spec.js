describe('edit_round', () => {
  const username = Cypress.env('USERNAME')
  const password = Cypress.env('PASSWORD')

  it('successfully loads', () => {
    cy.visit('/seasons', {
      auth: {
        username,
        password,
      },
    })
    cy.get('[data-test=select-season]').should('contain', '2021').should('have.value', '2021').select('2021')
    cy.get('[data-test="2021-01-02T01:01"] .edit-link').should('exist').click()

    // now on edit page
    cy.get('nav .active a').should('contain', 'edit round')
    return

    cy.get('input[name=date]').should('exist').type('2021-02-01T00:00')
    cy.get('select[name=course]').should('exist').select('The Oaks')
    cy.get('select[name=players]').should('exist')
    cy.get('select[name=players] option[data-test=Player1]').should('be.selected')
    cy.get('select[name=players] option[data-test=Player2]').should('be.selected')
    cy.get('select[name=players]').should('exist')
      .select([])
      .select(['Player1', 'Player2', 'Player3', 'Player4'])
      .invoke('val')
      .should('have.length', 4)

    cy.get('[data-test=add_matchup]').should('exist').click()
    cy.get('.matchup').should('have.length', 2)
    cy.get('.matchups select').last().should('exist').select(['Player3', 'Player4'])
    cy.get('[data-test=submit]').should('exist').click()

    // get the round uuid
    cy.get('input[name=uuid]').invoke('val').then(($val) => {
        const uuid = $val
        cy.log('round uuid', uuid)
        
        cy.visit('/rounds?season=2021&round='+uuid, {
          auth: {
            username,
            password,
          },
        })
        cy.get('[data-test=scorecard]').should('exist').within(() => {
          cy.get('[data-test=Player1] .hcp').should('contain', '+20')
          cy.get('[data-test=Player2] .hcp').should('contain', '+24')
          cy.get('[data-test=Player3] .hcp').should('contain', '+32')
          cy.get('[data-test=Player4] .hcp').should('contain', '+40')
        })

        cy.get('.matchups').should('contain', 'Player1 vs Player2')
        cy.get('.matchups').should('contain', 'Player3 vs Player4')
    })
  })
})
