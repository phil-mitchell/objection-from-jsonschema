'use strict';

var expect = require( 'chai' ).expect;

const{ Model } = require( 'objection' );
const Knex = require( 'knex' );

const require_helper = require( '../require_helper' );
const modelGenerator = require_helper( 'index' );
const schemaRefParser = require( 'json-schema-ref-parser' );


describe( 'basic single-table schema', function() {
    before( async function() {
        this.knex = Knex({
            client: 'sqlite3',
            useNullAsDefault: true,
            connection: {
                filename: ':memory:'
            }
        });
        Model.knex( this.knex );
        this.model = modelGenerator( Model, require( '../models/basic/employee.json' ) );

        await this.knex.schema.createTable( 'Employees', function( table ) {
            table.increments();
            table.string( 'firstName' );
            table.string( 'lastName' );
            table.integer( 'age' );
        });
    });
    it( 'has an Employees model', function() {
        expect( this.model ).to.have.ownProperty( 'Employees' );
    });
    it( 'can insert an Employee with defaults', async function() {
        const employee = await this.model.Employees.query().insert({});
        expect( employee ).to.eql({
            age: 37,
            id: 1
        });
        const persisted_employees = await this.model.Employees.query().where( 'id', employee.id );
        expect( persisted_employees ).to.eql( [ Object.assign({ firstName: null, lastName: null }, employee ) ] );
    });
    it( 'can insert an Employee with specific values', async function() {
        const employee = await this.model.Employees.query().insert({ firstName: 'Fred', lastName: 'Bloggs', age: 42 });
        expect( employee ).to.eql({
            firstName: 'Fred',
            lastName: 'Bloggs',
            age: 42,
            id: 2
        });
        const persisted_employees = await this.model.Employees.query().where( 'id', employee.id );
        expect( persisted_employees ).to.eql( [ employee ] );
    });
    it( 'can insert an Employee with extra fields', async function() {
        const employee = await this.model.Employees.query().insert({
            firstName: 'Fred', lastName: 'Bloggs', age: 42, extra: 'neous'
        });
        expect( employee ).to.eql({
            firstName: 'Fred',
            lastName: 'Bloggs',
            age: 42,
            extra: 'neous',
            id: 3
        });
        const persisted_employees = await this.model.Employees.query().where( 'id', employee.id );
        expect( persisted_employees ).to.eql( [ {
            firstName: 'Fred',
            lastName: 'Bloggs',
            age: 42,
            id: 3
        } ] );
    });
});

describe( 'basic nested schema', function() {
    before( async function() {
        this.knex = Knex({
            client: 'sqlite3',
            useNullAsDefault: true,
            connection: {
                filename: ':memory:'
            },
            pool: {
                afterCreate: ( conn, cb ) => {
                    conn.run( 'PRAGMA foreign_keys = ON', cb );
                }
            }
        });
        Model.knex( this.knex );
        this.model = modelGenerator(
            Model,
            await schemaRefParser.dereference( __dirname + '/../models/basic/root.json' )
        );

        await this.knex.schema.createTable( 'Address', function( table ) {
            table.increments();
            table.string( 'street' );
            table.string( 'city' );
        });

        await this.knex.schema.createTable( 'Basic', function( table ) {
            table.increments();
            table.integer( 'address_id' ).references( 'Address.id' );
        });

        await this.knex.schema.createTable( 'Employees', function( table ) {
            table.increments();
            table.string( 'firstName' );
            table.string( 'lastName' );
            table.integer( 'age' );
            table.integer( 'Basic_id' ).notNullable().references( 'Basic.id' );
        });
    });
    it( 'has a Basic model', function() {
        expect( this.model ).to.have.ownProperty( 'Basic' );
    });
    it( 'has an Employees model', function() {
        expect( this.model ).to.have.ownProperty( 'Employees' );
    });
    it( 'has an Address model', function() {
        expect( this.model ).to.have.ownProperty( 'Address' );
    });
    it( 'can insert a Basic entry with Address as a graph', async function() {
        const basic = await this.model.Basic.query().insertGraph({
            address: {
                street: '123 Fake Street',
                city: 'Waterloo'
            }
        });
        expect( basic ).to.eql({
            id: 1,
            address_id: 1,
            address: {
                id: 1,
                street: '123 Fake Street',
                city: 'Waterloo'
            }
        });
        expect( await this.model.Basic.query() ).to.eql( [ { id: 1, address_id: 1 } ] );
        expect( await this.model.Address.query() ).to.eql( [ { id: 1, city: 'Waterloo', street: '123 Fake Street' } ] );
    });
    it( 'requires a Basic_id to insert a new Employee', async function() {
        const employee = await this.model.Employees.query().insert({}).then( () => null, ( e ) => e );
        expect( employee ).to.exist;
        expect( employee.message ).to.contain( 'NOT NULL constraint failed' );
    });
    it( 'requires an existing Basic_id to insert a new Employee', async function() {
        const employee = await this.model.Employees.query().insert({ Basic_id: 2 }).then( () => null, ( e ) => e );
        expect( employee ).to.exist;
        expect( employee.message ).to.contain( 'FOREIGN KEY constraint failed' );
    });
    it( 'can insert an Employee with defaults', async function() {
        const employee = await this.model.Employees.query().insert({ Basic_id: 1 });
        expect( employee ).to.eql({
            age: 37,
            id: 1,
            Basic_id: 1
        });
        const persisted_employees = await this.model.Employees.query().where( 'id', employee.id );
        expect( persisted_employees ).to.eql( [ Object.assign({ firstName: null, lastName: null }, employee ) ] );
    });
    it( 'can insert an Employee with specific values', async function() {
        const employee = await this.model.Employees.query().insert({
            firstName: 'Fred', lastName: 'Bloggs', age: 42, Basic_id: 1
        });
        expect( employee ).to.eql({
            firstName: 'Fred',
            lastName: 'Bloggs',
            age: 42,
            id: 2,
            Basic_id: 1
        });
        const persisted_employees = await this.model.Employees.query().where( 'id', employee.id );
        expect( persisted_employees ).to.eql( [ employee ] );
    });
    it( 'can insert an Employee with extra fields', async function() {
        const employee = await this.model.Employees.query().insert({
            firstName: 'Fred', lastName: 'Bloggs', age: 42, extra: 'neous', Basic_id: 1
        });
        expect( employee ).to.eql({
            firstName: 'Fred',
            lastName: 'Bloggs',
            age: 42,
            extra: 'neous',
            id: 3,
            Basic_id: 1
        });
        const persisted_employees = await this.model.Employees.query().where( 'id', employee.id );
        expect( persisted_employees ).to.eql( [ {
            firstName: 'Fred',
            lastName: 'Bloggs',
            age: 42,
            id: 3,
            Basic_id: 1
        } ] );
    });
    it( 'can get the employees through the Basic schema', async function() {
        const basic = await this.model.Basic.query().eager( 'employees' );
        expect( basic ).to.have.length( 1 );
        expect( basic[0].id ).to.eql( 1 );
        expect( basic[0].employees ).to.have.length( 3 );
        expect( basic[0].employees ).to.eql( [ {
            id: 1, firstName: null, lastName: null, age: 37, Basic_id: 1
        }, {
            id: 2, firstName: 'Fred', lastName: 'Bloggs', age: 42, Basic_id: 1
        }, {
            id: 3, firstName: 'Fred', lastName: 'Bloggs', age: 42, Basic_id: 1
        } ] );
    });
});

describe( 'basic schema with multiple foreign keys', function() {
    before( async function() {
        this.knex = Knex({
            client: 'sqlite3',
            useNullAsDefault: true,
            connection: {
                filename: ':memory:'
            },
            pool: {
                afterCreate: ( conn, cb ) => {
                    conn.run( 'PRAGMA foreign_keys = ON', cb );
                }
            }
        });
        Model.knex( this.knex );
        this.model = modelGenerator(
            Model,
            await schemaRefParser.dereference( __dirname + '/../models/branching/root.json' )
        );

        await this.knex.schema.createTable( 'Address', function( table ) {
            table.increments();
            table.string( 'street' );
            table.string( 'city' );
            table.integer( 'Basic_id' ).notNullable().references( 'Basic.id' );
            table.integer( 'Employees_id' ).notNullable().references( 'Employees.id' );
        });

        await this.knex.schema.createTable( 'Basic', function( table ) {
            table.increments();
        });

        await this.knex.schema.createTable( 'Employees', function( table ) {
            table.increments();
            table.string( 'firstName' );
            table.string( 'lastName' );
            table.integer( 'age' );
            table.integer( 'Basic_id' ).notNullable().references( 'Basic.id' );
        });
    });
    it( 'has a Basic model', function() {
        expect( this.model ).to.have.ownProperty( 'Basic' );
    });
    it( 'has an Employees model', function() {
        expect( this.model ).to.have.ownProperty( 'Employees' );
    });
    it( 'has an Address model', function() {
        expect( this.model ).to.have.ownProperty( 'Address' );
    });
    it( 'can insert a Basic entry with Employee and Address as a graph', async function() {
        const basic = await this.model.Basic.query().insertGraphAndFetch({
            '#id': 'Basic1',
            employees: [ {
                firstName: 'Fred',
                lastName: 'Bloggs',
                age: 42,
                past_addresses: [ {
                    street: '123 Fake Street',
                    city: 'Waterloo',
                    Basic_id: 1
                } ]
            } ]
        });
        expect( basic ).to.eql({
            id: 1,
            employees: [ {
                id: 1,
                Basic_id: 1,
                age: 42,
                firstName: 'Fred',
                lastName: 'Bloggs',
                past_addresses: [ {
                    id: 1,
                    Basic_id: 1,
                    Employees_id: 1,
                    city: 'Waterloo',
                    street: '123 Fake Street'
                } ]
            } ]
        });
        expect( await this.model.Basic.query() ).to.eql( [ { id: 1 } ] );
        expect( await this.model.Address.query() ).to.eql( [ {
            Basic_id: 1, Employees_id: 1, id: 1, city: 'Waterloo', street: '123 Fake Street'
        } ] );
    });
    it( 'requires a Basic_id to insert a new Employee', async function() {
        const employee = await this.model.Employees.query().insert({}).then( () => null, ( e ) => e );
        expect( employee ).to.exist;
        expect( employee.message ).to.contain( 'NOT NULL constraint failed' );
    });
    it( 'requires an existing Basic_id to insert a new Employee', async function() {
        const employee = await this.model.Employees.query().insert({ Basic_id: 2 }).then( () => null, ( e ) => e );
        expect( employee ).to.exist;
        expect( employee.message ).to.contain( 'FOREIGN KEY constraint failed' );
    });
    it( 'can insert an Employee with defaults', async function() {
        const employee = await this.model.Employees.query().insert({ Basic_id: 1 });
        expect( employee ).to.eql({
            age: 37,
            id: 2,
            Basic_id: 1
        });
        const persisted_employees = await this.model.Employees.query().where( 'id', employee.id );
        expect( persisted_employees ).to.eql( [ Object.assign({ firstName: null, lastName: null }, employee ) ] );
    });
    it( 'can insert an Employee with specific values', async function() {
        const employee = await this.model.Employees.query().insert({
            firstName: 'Fred', lastName: 'Bloggs', age: 42, Basic_id: 1
        });
        expect( employee ).to.eql({
            firstName: 'Fred',
            lastName: 'Bloggs',
            age: 42,
            id: 3,
            Basic_id: 1
        });
        const persisted_employees = await this.model.Employees.query().where( 'id', employee.id );
        expect( persisted_employees ).to.eql( [ employee ] );
    });
    it( 'can insert an Employee with extra fields', async function() {
        const employee = await this.model.Employees.query().insert({
            firstName: 'Fred', lastName: 'Bloggs', age: 42, extra: 'neous', Basic_id: 1
        });
        expect( employee ).to.eql({
            firstName: 'Fred',
            lastName: 'Bloggs',
            age: 42,
            extra: 'neous',
            id: 4,
            Basic_id: 1
        });
        const persisted_employees = await this.model.Employees.query().where( 'id', employee.id );
        expect( persisted_employees ).to.eql( [ {
            firstName: 'Fred',
            lastName: 'Bloggs',
            age: 42,
            id: 4,
            Basic_id: 1
        } ] );
    });
    it( 'can get the employees through the Basic schema', async function() {
        const basic = await this.model.Basic.query().eager( 'employees' );
        expect( basic ).to.have.length( 1 );
        expect( basic[0].id ).to.eql( 1 );
        expect( basic[0].employees ).to.have.length( 4 );
        expect( basic[0].employees ).to.eql( [ {
            id: 1, firstName: 'Fred', lastName: 'Bloggs', age: 42, Basic_id: 1
        }, {
            id: 2, firstName: null, lastName: null, age: 37, Basic_id: 1
        }, {
            id: 3, firstName: 'Fred', lastName: 'Bloggs', age: 42, Basic_id: 1
        }, {
            id: 4, firstName: 'Fred', lastName: 'Bloggs', age: 42, Basic_id: 1
        } ] );
    });
    it( 'can get the addresses through the Basic schema', async function() {
        const basic = await this.model.Basic.query().eager( 'addresses' );
        expect( basic ).to.have.length( 1 );
        expect( basic[0].id ).to.eql( 1 );
        expect( basic[0].addresses ).to.have.length( 1 );
        expect( basic[0].addresses ).to.eql( [ {
            id: 1, street: '123 Fake Street', city: 'Waterloo', Basic_id: 1, Employees_id: 1
        } ] );
    });
    it( 'can get the addresses through the Employees schema', async function() {
        const basic = await this.model.Employees.query().eager( 'past_addresses' );
        expect( basic ).to.have.length( 4 );
        expect( basic[0].id ).to.eql( 1 );
        expect( basic[0].past_addresses ).to.have.length( 1 );
        expect( basic[0].past_addresses ).to.eql( [ {
            id: 1, street: '123 Fake Street', city: 'Waterloo', Basic_id: 1, Employees_id: 1
        } ] );
    });
});
