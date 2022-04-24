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

    cy.get('[data-test=select-season]').should('exist')
    cy.get('[data-test=select-round]').should('exist')
    cy.get('[data-test=select-season-round]').should('exist')
  })

  it('select season and round', () => {
    cy.visit('/rounds', {
      auth: {
        username,
        password,
      },
    })

    cy.get('[data-test=select-season]').should('contain', '2021').select('2021')
    cy.get('[data-test=select-round]').should('contain', '2021-01-01 Yahara East (front)')
      .select('2021-01-01 Yahara East (front)')
    cy.get('[data-test=select-season-round]').should('not.exist')

    // test scorecard
    cy.get('[data-test=scorecard]').should('exist').within(() => {
      cy.get('[data-test=Player1] .hcp').should('contain', '+10')
      cy.get('[data-test=Player1] :nth-last-child(2)').should('contain', '43')
      cy.get('[data-test=Player1] :last-child').should('contain', '33')

      cy.get('[data-test=Player2] .hcp').should('contain', '+12')
      cy.get('[data-test=Player2] :nth-last-child(2)').should('contain', '51')
      cy.get('[data-test=Player2] :last-child').should('contain', '39')

      cy.get('[data-test=Player3] .hcp').should('contain', '+16')
      cy.get('[data-test=Player3] :nth-last-child(2)').should('contain', '63')
      cy.get('[data-test=Player3] :last-child').should('contain', '47')

      cy.get('[data-test=Player4] .hcp').should('contain', '+20')
      cy.get('[data-test=Player4] :nth-last-child(2)').should('contain', '57')
      cy.get('[data-test=Player4] :last-child').should('contain', '37')
    })

    // test matchups
    cy.get('[data-test=matchup]').should('have.length', 2)
    cy.get('[data-test=matchup]:nth-child(1)').within(() => {
      cy.get('h3').should('contain', 'Matchup: Player1 vs Player2')
      cy.get('[data-test=Player1]').within(() => {
        cy.get('.hcp').should('contain', '')
        // nth child is hole num + 1
        cy.get('td:nth-child(2)').should('have.class', 'win')
        cy.get('td:nth-child(3)').should('have.class', 'tie')
        cy.get('td:nth-child(4)').should('have.class', 'tie')
        cy.get('td:nth-child(5)').should('have.class', 'tie')
        cy.get('td:nth-child(6)').should('have.class', 'tie')
        cy.get('td:nth-child(7)').should('have.class', 'win')
        cy.get('td:nth-child(8)').should('have.class', 'win')
        cy.get('td:nth-child(9)').should('have.class', 'win')
        cy.get('td:nth-child(10)').should('have.class', 'tie')
        cy.get('.total_points').should('contain', '10.5')
      })
      cy.get('[data-test=Player2]').within(() => {
        cy.get('.hcp').should('contain', '+2')
        // nth child is hole num + 1
        cy.get('td:nth-child(5) .hcp_dots').invoke('text').invoke('trim').should('not.equal', '')
        cy.get('td:nth-child(2) .hcp_dots').invoke('text').invoke('trim').should('not.equal', '')
        cy.get('td:nth-child(3)').should('have.class', 'tie')
        cy.get('td:nth-child(4)').should('have.class', 'tie')
        cy.get('td:nth-child(5)').should('have.class', 'tie')
        cy.get('td:nth-child(6)').should('have.class', 'tie')
        cy.get('td:nth-child(10)').should('have.class', 'tie')
        cy.get('.total_points').should('contain', '2.5')
      })
    })
    cy.get('[data-test=matchup]:nth-child(2)').within(() => {
      cy.get('h3').should('contain', 'Matchup: Player3 vs Player4')
      cy.get('[data-test=Player3]').within(() => {
        cy.get('.hcp').should('contain', '')
        // nth child is hole num + 1
        cy.get('td:nth-child(6)').should('have.class', 'tie')
        cy.get('td:nth-child(8)').should('have.class', 'tie')
        cy.get('td:nth-child(9)').should('have.class', 'tie')
        cy.get('.total_points').should('contain', '1.5')
      })
      cy.get('[data-test=Player4]').within(() => {
        cy.get('.hcp').should('contain', '+4')
        // nth child is hole num + 1
        cy.get('td:nth-child(6) .hcp_dots').invoke('text').invoke('trim').should('not.equal', '')
        cy.get('td:nth-child(3) .hcp_dots').invoke('text').invoke('trim').should('not.equal', '')
        cy.get('td:nth-child(2) .hcp_dots').invoke('text').invoke('trim').should('not.equal', '')
        cy.get('td:nth-child(5) .hcp_dots').invoke('text').invoke('trim').should('not.equal', '')
        cy.get('td:nth-child(2)').should('have.class', 'win')
        cy.get('td:nth-child(3)').should('have.class', 'win')
        cy.get('td:nth-child(4)').should('have.class', 'win')
        cy.get('td:nth-child(5)').should('have.class', 'win')
        cy.get('td:nth-child(6)').should('have.class', 'tie')
        cy.get('td:nth-child(7)').should('have.class', 'win')
        cy.get('td:nth-child(8)').should('have.class', 'tie')
        cy.get('td:nth-child(9)').should('have.class', 'tie')
        cy.get('td:nth-child(10)').should('have.class', 'win')
        cy.get('.total_points').should('contain', '11.5')
      })
    })
  })
})
