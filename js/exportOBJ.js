//exportOBJ.js

function exportOBJ( object ) {
    //initialize empty string
    var objText = "";
    // first print all the vertices to the file
    for (i = 0; i < object.geometry.vertices.length; i++) {
        var curr_vertex = object.geometry.vertices[ i ];
        objText = objText + "v " + curr_vertex.x + " " +
            curr_vertex.y + " " + curr_vertex.z + "\n";
    }

    // for aesthetic reasons add a space between vertices and faces
    objText = objText + "\n";
    // now print all the faces to the file
    for (i = 0; i < object.geometry.faces.length; i++) {
        var curr_face = object.geometry.faces[ i ];
        // add 1 to face number since threejs uses 0 index but .obj files start at 1
        objText = objText + "f " + ( curr_face.a + 1 ) + " " +
            ( curr_face.b + 1 ) + " " + ( curr_face.c + 1 ) + "\n";
    }

    // return the blob file object
    return makeTextFile( objText );
}

// make a text file from text
function makeTextFile( text ) {
    // the data in the file as plain text
    var data = new Blob( [ text ], { type: 'text/plain' } );
    // create the object in this window and return it
    var textFile = window.URL.createObjectURL( data );
    return textFile;
}
