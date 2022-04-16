describe('seasons', () => {
  const username = Cypress.env('USERNAME')
  const password = Cypress.env('PASSWORD')

  it('successfully loads', () => {
    cy.visit('/seasons', {
      auth: {
        username,
        password,
      },
    })

    cy.get('nav .active a').should('contain', 'seasons')

    cy.get('[data-test=select-season]').should('exist')
  })

  it('select season', () => {
    cy.visit('/seasons', {
      auth: {
        username,
        password,
      },
    })

    cy.get('[data-test=select-season]').should('contain', '2021').should('have.value', '2021').select('2021')

    cy.get('[data-test=season]').within(() => {
      cy.get('[data-test=player-name]:nth-child(2)').invoke('text').invoke('trim').should('equal', 'Player4')
      cy.get('[data-test=player-name]:nth-child(3)').invoke('text').invoke('trim').should('equal', 'Player1')
      cy.get('[data-test=player-name]:nth-child(4)').invoke('text').invoke('trim').should('equal', 'Player2')
      cy.get('[data-test=player-name]:nth-child(5)').invoke('text').invoke('trim').should('equal', 'Player3')

      cy.get('[data-test=2021-01-01]').should('exist').within(() => {
        cy.get('.cell:nth-child(2)').should('contain', '7.5 + 4')
        cy.get('.cell:nth-child(3)').should('contain', '6.5 + 4')
        cy.get('.cell:nth-child(4)').should('contain', '2.5 + 0')
        cy.get('.cell:nth-child(5)').should('contain', '1.5 + 0')
      })
    })
  })
})
