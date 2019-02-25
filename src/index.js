'use strict';

const schemaWalker = require( '@cloudflare/json-schema-walker' );

function isTableSchema( schema ) {
    return( schema.$id && (
        schema.type === undefined ||
            schema.type === 'object' ||
            typeof( schema.properties ) === 'object'
    ) );
}

function schemaTableName( schema ) {
    return schema[ 'objection-table-name' ] || schema.title || schema.$id;
}

function schemaIdColumn( schema ) {
    return schema[ 'objection-id-column' ] || 'id';
}

module.exports = ( Model, schemaRoot ) => {
    var model = {};

    function preSchema( schema, path, parent ) {
        schema['objection-relation-mappings'] = {};
        if( isTableSchema( schema ) ) {
            schema['objection-table-path'] = schemaTableName( schema );
            schema['objection-id-column'] = schemaIdColumn( schema );
            schema['objection-id-path'] = `${schema['objection-table-path']}.${schema['objection-id-column']}`;
        } else if( parent ) {
            schema['objection-table-path'] = `${parent['objection-table-path']}.${path[path.length-1]}`;
            schema['objection-id-column'] = parent['objection-id-column'];
            schema['objection-id-path'] = parent['objection-id-path'];
        }
    }

    function postSchema( schema, path, parent ) {
        if( isTableSchema( schema ) ) {
            var filteredSchema = Object.keys( schema ).filter(
                key => !key.startsWith( 'objection-' )
            ).reduce( ( obj, key ) => {
                obj[key] = schema[key];
                return obj;
            }, { properties: {} });

            filteredSchema.properties = Object.keys( filteredSchema.properties ).filter(
                key => ( Model.virtualAttributes || [] ).indexOf( key ) === -1
            ).reduce( ( obj, key ) => {
                obj[key] = filteredSchema.properties[key];
                return obj;
            }, {});

            var tableName = schema[ 'objection-table-name' ] || schema.title || schema.$id;
            var idColumn = schema[ 'objection-id-column' ];
            var relationMappings = schema[ 'objection-relation-mappings' ] || {};

            var modelClass = class JSONSchemaModel extends Model {
                static get tableName() {
                    return tableName;
                }

                static get pickJsonSchemaProperties() {
                    return true;
                }

                static get idColumn() {
                    return idColumn;
                }

                static get jsonSchema() {
                    return filteredSchema;
                }

                static get relationMappings() {
                    return relationMappings;
                }
            };

            model[ schema[ 'objection-model-name' ] || schema.title || schema.$id ] = modelClass;

            if( parent ) {
                if( parent.properties ) {
                    let parentPath = path[path.length-1];
                    delete parent.properties[parentPath];

                    let joinFrom = `${parentPath}_id`;

                    parent.properties[joinFrom] = { type: 'integer' };
                    parent['objection-relation-mappings'][parentPath] = {
                        relation: Model.BelongsToOneRelation,
                        modelClass: modelClass,
                        join: {
                            from: `${parent['objection-table-path']}.${joinFrom}`,
                            to: `${tableName}.${idColumn}`
                        }
                    };
                } else {
                    parent['objection-array-relation'] = {
                        relation: Model.HasManyRelation,
                        modelClass: modelClass,
                        join: {
                            to: `${tableName}.${idColumn}`
                        }
                    };
                }
            }
        } else if( parent ) {
            Object.assign( parent['objection-relation-mappings'], schema[ 'objection-relation-mappings' ] );

            if( schema['objection-array-relation'] ) {
                let parentPath = path[path.length-1];
                delete parent.properties[parentPath];
                schema['objection-array-relation'].join.from = schema['objection-id-path'];

                if( schema['objection-join-to-column'] ) {
                    schema['objection-array-relation'].join.to = schema['objection-join-to-column'];
                } else if( schema['objection-join-through'] ) {
                    schema['objection-array-relation'].join.through = schema['objection-join-through'];
                } else {
                    let joinTo = schema['objection-array-relation'].join.to.split( '.' );
                    joinTo[joinTo.length-1] = schema['objection-id-path'].replace( /\./g, '_' );
                    schema['objection-array-relation'].join.to = joinTo.join( '.' );
                    if( ! schema['objection-array-relation'].modelClass.jsonSchema.properties.hasOwnProperty( joinTo[joinTo.length-1] ) ) {
                        schema['objection-array-relation'].modelClass.jsonSchema.properties[joinTo[joinTo.length-1]] = { type: 'integer' };
                    }
                }
                parent['objection-relation-mappings'][parentPath] = schema['objection-array-relation'];
            }
        }

        delete schema[ 'objection-relation-mappings' ];
        delete schema[ 'objection-table-path' ];
        delete schema[ 'objection-array-relation' ];
        delete schema[ 'objection-id-column' ];
        delete schema[ 'objection-id-path' ];
    }

    schemaRoot = JSON.parse( JSON.stringify( schemaRoot ) );
    const vocab = schemaWalker.getVocabulary( schemaRoot, schemaWalker.vocabularies.DRAFT_04 );
    schemaWalker.schemaWalk( schemaRoot, preSchema, postSchema, vocab );

    return model;
};
