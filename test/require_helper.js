'use strict';

const path = require( 'path' );
const rewire = require( 'rewire' );

const src_dir = ( process.env.APP_DIR_FOR_CODE_COVERAGE || path.resolve( __dirname, '..' ) ) + '/src/';
module.exports = function( req, use_rewire ) {
    if( use_rewire ) {
        return rewire( src_dir + req );
    } else {
        return require( src_dir + req );
    }
};
