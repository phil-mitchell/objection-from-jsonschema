'use strict';

var expect = require( 'chai' ).expect;
var require_helper = require( '../require_helper' );
var modelGenerator = require_helper( 'index' );

class FakeModel {
    fakeModelMethod() {
        return( 'fake' );
    }

    static get virtualAttributes() {
        return[ 'etag' ];
    }
}

FakeModel.BelongsToOneRelation = 'BelongsToOneRelation';
FakeModel.HasManyRelation = 'HasManyRelation';


describe( 'Model Generator', function() {
    it( 'returns empty model for empty schemas', function() {
        var schema = {};
        var blank = modelGenerator( FakeModel, schema );
        expect( blank ).to.eql({});
    });

    it( 'returns empty model for scalar schemas', function() {
        var schema = { type: 'string' };
        var blank = modelGenerator( FakeModel, schema );
        expect( blank ).to.eql({});
    });

    it( 'returns empty model for object schema with no title', function() {
        var schema = {
            type: 'object'
        };
        var blank = modelGenerator( FakeModel, schema );
        expect( blank ).to.eql({});
    });

    it( 'returns single model class for object schema with no nested objects', function() {
        var schema = {
            type: 'object',
            $id: './testModel',
            title: 'TestModel',
            properties: {
                name: { type: 'string' },
                address: { type: 'string' }
            }
        };
        var model = modelGenerator( FakeModel, schema );
        expect( model ).to.have.ownProperty( 'TestModel' );
        expect( model.TestModel ).to.be.a( 'function' );
        expect( model.TestModel.tableName ).to.eql( 'TestModel' );
        expect( model.TestModel.pickJsonSchemaProperties ).to.be.true;
        expect( model.TestModel.jsonSchema ).to.eql( schema );

        expect( model.TestModel.relationMappings ).to.eql({});

        var instance = new model.TestModel();
        expect( instance ).to.be.an( 'object' );
        expect( instance.fakeModelMethod() ).to.eql( 'fake' );
    });

    it( 'excludes model properties that are listed as virtualAttributes', function() {
        var schema = {
            type: 'object',
            $id: './testModel',
            title: 'TestModel',
            properties: {
                name: { type: 'string' },
                address: { type: 'string' },
                etag: { type: 'byte' }
            }
        };
        var model = modelGenerator( FakeModel, schema );
        expect( model ).to.have.ownProperty( 'TestModel' );
        expect( model.TestModel ).to.be.a( 'function' );
        expect( model.TestModel.tableName ).to.eql( 'TestModel' );
        expect( model.TestModel.pickJsonSchemaProperties ).to.be.true;
        expect( model.TestModel.jsonSchema ).to.eql( schema );

        expect( model.TestModel.relationMappings ).to.eql({
            type: 'object',
            $id: './testModel',
            title: 'TestModel',
            properties: {
                name: { type: 'string' },
                address: { type: 'string' }
            }
        });

        var instance = new model.TestModel();
        expect( instance ).to.be.an( 'object' );
        expect( instance.fakeModelMethod() ).to.eql( 'fake' );
    });

    it( 'returns single model class for object schema with nested object', function() {
        var schema = {
            type: 'object',
            $id: './testModel',
            title: 'TestModel',
            properties: {
                name: { type: 'string' },
                address: {
                    type: 'object',
                    properties: {
                        street: { type: 'string' },
                        city: { type: 'string', 'default': 'Waterloo' }
                    }
                }
            }
        };
        var model = modelGenerator( FakeModel, schema );
        expect( model ).to.have.ownProperty( 'TestModel' );
        expect( model.TestModel ).to.be.a( 'function' );
        expect( model.TestModel.tableName ).to.eql( 'TestModel' );
        expect( model.TestModel.pickJsonSchemaProperties ).to.be.true;
        expect( model.TestModel.jsonSchema ).to.eql( schema );

        expect( model.TestModel.relationMappings ).to.eql({});

        var instance = new model.TestModel();
        expect( instance ).to.be.an( 'object' );
        expect( instance.fakeModelMethod() ).to.eql( 'fake' );
    });

    it( 'returns single model class for object schema with nested array of objects', function() {
        var schema = {
            type: 'object',
            $id: './testModel',
            title: 'TestModel',
            properties: {
                name: { type: 'string' },
                addresses: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            street: { type: 'string' },
                            city: { type: 'string', 'default': 'Waterloo' }
                        }
                    }
                }
            }
        };
        var model = modelGenerator( FakeModel, schema );
        expect( model ).to.have.ownProperty( 'TestModel' );
        expect( model.TestModel ).to.be.a( 'function' );
        expect( model.TestModel.tableName ).to.eql( 'TestModel' );
        expect( model.TestModel.pickJsonSchemaProperties ).to.be.true;
        expect( model.TestModel.jsonSchema ).to.eql( schema );

        expect( model.TestModel.relationMappings ).to.eql({});

        var instance = new model.TestModel();
        expect( instance ).to.be.an( 'object' );
        expect( instance.fakeModelMethod() ).to.eql( 'fake' );
    });

    it( 'creates additional table for object property with $id', function() {
        var schema = {
            $id: 'rootid',
            title: 'TestModel',
            type: 'object',
            properties: {
                name: { type: 'string' },
                address: {
                    $id: 'objid',
                    type: 'object',
                    properties: {
                        street: { type: 'string' },
                        city: { type: 'string', 'default': 'Waterloo' }
                    }
                }
            }
        };
        var model = modelGenerator( FakeModel, schema );

        expect( model ).to.have.ownProperty( 'TestModel' );
        expect( model.TestModel ).to.be.a( 'function' );
        expect( model.TestModel.tableName ).to.eql( 'TestModel' );
        expect( model.TestModel.pickJsonSchemaProperties ).to.be.true;
        expect( model.TestModel.jsonSchema ).to.eql({
            $id: 'rootid',
            title: 'TestModel',
            type: 'object',
            properties: {
                name: { type: 'string' },
                address_id: { type: 'integer' }
            }
        });
        expect( model.TestModel.relationMappings ).to.eql({
            address: {
                join: {
                    from: 'TestModel.address_id',
                    to: 'objid.id'
                },
                modelClass: model.objid,
                relation: 'BelongsToOneRelation'
            }
        });
        var instance = new model.TestModel();
        expect( instance ).to.be.an( 'object' );
        expect( instance.fakeModelMethod() ).to.eql( 'fake' );

        expect( model ).to.have.ownProperty( 'objid' );
        expect( model.objid ).to.be.a( 'function' );
        expect( model.objid.tableName ).to.eql( 'objid' );
        expect( model.objid.pickJsonSchemaProperties ).to.be.true;
        expect( model.objid.jsonSchema ).to.eql( schema.properties.address );
        expect( model.objid.relationMappings ).to.eql({});
        var subinstance = new model.objid();
        expect( subinstance ).to.be.an( 'object' );
        expect( subinstance.fakeModelMethod() ).to.eql( 'fake' );
    });

    it( 'creates additional table for array property with items having $id', function() {
        var schema = {
            $id: 'rootid',
            title: 'TestModel',
            type: 'object',
            properties: {
                name: { type: 'string' },
                addresses: {
                    type: 'array',
                    items: {
                        '$id': 'objid'
                    }
                }
            }
        };
        var model = modelGenerator( FakeModel, schema );

        expect( model ).to.have.ownProperty( 'TestModel' );
        expect( model.TestModel ).to.be.a( 'function' );
        expect( model.TestModel.tableName ).to.eql( 'TestModel' );
        expect( model.TestModel.pickJsonSchemaProperties ).to.be.true;
        expect( model.TestModel.jsonSchema ).to.eql({
            $id: 'rootid',
            title: 'TestModel',
            type: 'object',
            properties: {
                name: { type: 'string' }
            }
        });
        expect( model.TestModel.relationMappings ).to.eql({
            addresses: {
                join: {
                    from: 'TestModel.id',
                    to: 'objid.TestModel_id'
                },
                modelClass: model.objid,
                relation: 'HasManyRelation'
            }
        });
        var instance = new model.TestModel();
        expect( instance ).to.be.an( 'object' );
        expect( instance.fakeModelMethod() ).to.eql( 'fake' );

        expect( model ).to.have.ownProperty( 'objid' );
        expect( model.objid ).to.be.a( 'function' );
        expect( model.objid.tableName ).to.eql( 'objid' );
        expect( model.objid.pickJsonSchemaProperties ).to.be.true;
        expect( model.objid.jsonSchema ).to.eql( Object.assign({
            properties: {
                TestModel_id: { type: 'integer' }
            }
        }, schema.properties.addresses.items ) );
        expect( model.objid.relationMappings ).to.eql({});
        var subinstance = new model.objid();
        expect( subinstance ).to.be.an( 'object' );
        expect( subinstance.fakeModelMethod() ).to.eql( 'fake' );
    });
});
