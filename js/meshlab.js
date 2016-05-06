function handleFileSelect(evt, meshFromFile, meshLab, callback) {
    var files = evt.target.files; // FileList object
    console.log("Name: ", files[0].name);
    console.log("Size: ", files[0].size);
    console.time("File Reading Time");

    //extract format file
    var fileName = files[0].name;
    var format = fileName.split(".");
    format = format[format.length-1];
    fileName= "tmp." + format;
    switch(format){
        case "off": {break;}
        case "obj": {break;}
        case "ply": {break;}
        case "stl": {break;}
        case "vmi": {break;}
        default : {
            alert("MeshLabJs allows file format '.off', '.ply', '.vmi', '.obj' and '.stl'. \nTry again.")
            return;
        }
    }
    
    var fileToLoad = files[0];
    var fileReader = new FileReader();
  
    fileReader.onload = function (fileLoadedEvent) {

    //  Emscripten need a Arrayview so from the returned arraybuffer we must create a view of it as 8bit chars
        var int8buf = new Int8Array(fileLoadedEvent.target.result); 
        FS.createDataFile("/", fileName, int8buf, true, true);

        meshLab.setMeshName(fileName);

        console.log("Read file", fileLoadedEvent.target.result.byteLength );
        console.timeEnd("File Reading Time");
        console.time("Parsing mesh Time");

        var openMeshResult = meshLab.openMesh(fileName);

        console.timeEnd("Parsing mesh Time");
        console.time("Getting mesh Time");

        console.log("openMesh result is "+openMeshResult);

        meshFromFile =  createMesh(meshFromFile, meshLab);

        FS.unlink(fileName);
        //console.log("inside onload?: " + typeof meshFromFile);

        //essentially, returns meshFromFile and meshLab
        callback(meshFromFile, meshLab);

    };

    fileReader.readAsArrayBuffer(fileToLoad, "UTF-8");  // Efficient binary read.
    //console.log("inside filereader?: " + typeof meshFromFile);
}

function createMesh(mesh, meshLab) 
    {
    var VN = meshLab.VN();
    var vert = meshLab.getVertexVector(true);
    var face = meshLab.getFaceIndex();
    var FN = meshLab.FN();
    var geometry = new THREE.Geometry();
    console.time("Creating Mesh Time");
  

    face_normals = buildFaceNormals(meshLab);
    vertex_normals = buildVertexNormals(meshLab);

    //get vertices and vertex normals
    for(var i=0; i<VN*3; i++){
            var v1 = Module.getValue(vert+parseInt(i*4),'float'); 
            var VN_1 = vertex_normals[i]; i++;
            var v2 = Module.getValue(vert+parseInt(i*4),'float');
            var VN_2 = vertex_normals[i]; i++;
            var v3 = Module.getValue(vert+parseInt(i*4),'float');
            var VN_3 = vertex_normals[i];
            vector_normal = new THREE.Vector3(VN_1, VN_2, VN_3);
            geometry.vertices.push( new THREE.Vector3(v1,v2,v3, vector_normal) );
    }

    //get face and face normals
    for(var i=0; i<FN*3; i++){
            var a = Module.getValue(face+parseInt(i*4),'*'); 
            var FN_1 = vertex_normals[i]; i++;
            var b = Module.getValue(face+parseInt(i*4),'*'); 
            var FN_2 = vertex_normals[i]; i++;
            var c = Module.getValue(face+parseInt(i*4),'*'); 
            var FN_3 = vertex_normals[i]; 
            face_normals = new THREE.Vector3(FN_1, FN_2, FN_3);
            geometry.faces.push( new THREE.Face3(a,b,c, face_normals) );
    }

    console.timeEnd("Creating Mesh Time");
    console.log("Vertices are " + VN );
    console.log("Faces are " + FN);

    var material = new THREE.MeshLambertMaterial( { color:  0x2194ce, side: THREE.DoubleSide}); 

    //create or update the mesh
    if( mesh == null ) {
        mesh = new THREE.Mesh( geometry, material );
        mesh.geometry.dynamic = true;
        mesh.geometry.verticesNeedUpdate = true;
        geometry.normalsNeedUpdate = true;
    } else {
        mesh.geometry = geometry;
        mesh.material = material;
        mesh.geometry.dynamic = true;
        mesh.geometry.verticesNeedUpdate = true;
        mesh.geometry.normalsNeedUpdate = true;              
    }
    //console.log("in createMesh: " + typeof mesh);
    return mesh;
}

//perform quadric simplification
function QuadricSimp(mesh, meshLab){

    console.log("Start Quadric Simp ...");
    console.time("Quadric Simplification Time");

    //variables for Quadric Simplification
    var ratioWdg = 0.7;
    var topologicalQuadricWdg = true;
    var  qualityQuadricWdg = true;

    Module.QuadricSimplification(meshLab.getMeshPtr(), ratioWdg, 0, 
                             topologicalQuadricWdg, qualityQuadricWdg);
    console.timeEnd("Quadric Simplification Time");

     //setting tags back to true
    buildFaceNormals(meshLab);
    buildVertexNormals(meshLab);
    mesh.geometry.verticesNeedUpdate = true;
    mesh.geometry.nomalsNeedUpdate = true;
    mesh.geometry.dynamic = true;

    var newMesh = createMesh(mesh, meshLab);

}

function ClusteringSimp(mesh, meshLab){
    console.log("Start Clustering Simp ... ");
    console.time("Clustering Simplification Time");

    Module.ClusteringSimplification(meshLab.getMeshPtr(), 0.0000001);
    console.timeEnd("Clustering Simplificaiton Time");

    //setting tags back to true
    buildFaceNormals(meshLab);
    buildVertexNormals(meshLab);
    mesh.geometry.dynamic = true;
    mesh.geometry.verticesNeedUpdate = true;
    mesh.geometry.nomalsNeedUpdate = true;

    createMesh(mesh, meshLab);
}

function removeDupVert(mesh, meshLab){
    console.log("Start Duplicate Vertex Removal ...");
    console.time("Clustering Simplification Time");

    Module.RemoveDuplicatedVertices(meshLab.getMeshPtr());
    console.timeEnd("Clustering Simplification Time");

    //setting tags back to true
    buildFaceNormals(meshLab);
    buildVertexNormals(meshLab);
    mesh.geometry.dynamic = true;
    mesh.geometry.verticesNeedUpdate = true;
    mesh.geometry.nomalsNeedUpdate = true;

    createMesh(mesh, meshLab);
}

function buildFaceNormals(meshLab) {
    if(fnb != null) fnb.delete();
    var fnb = new Module.FaceNormalBuilder();
    fnb.init(meshLab.getMeshPtr());
    var normalArray   = new Float32Array(Module.HEAPU8.buffer, fnb.getNormalBuf(),   meshLab.FN() * 6);

    return normalArray;
}

function buildVertexNormals(meshLab) {

    const SIZEOF_FLOAT = 4;
    const NUM_BYTES_PER_VERTEX = 3 * SIZEOF_FLOAT;

    var startBuffer = Module.buildVertexNormalsVec(meshLab.getMeshPtr());
    meshLab.vertexNormalsPtr = startBuffer;

    var normalsCoordsPtr = startBuffer + (meshLab.VN() * 2 * NUM_BYTES_PER_VERTEX + meshLab.VN() * 2 * SIZEOF_FLOAT);
    var normals = new Float32Array(Module.HEAPU8.buffer, normalsCoordsPtr, (meshLab.VN() * 2 * NUM_BYTES_PER_VERTEX) / SIZEOF_FLOAT);

    return normals;
}

function LaplSmooth(mesh, meshLab){
    console.log("Start Smoothing Algorithm ... ");
    console.time("Laplacian Smooth Time");

    Module.LaplacianSmooth(meshLab.getMeshPtr(), 1, false);
    console.timeEnd("Laplacian Smooth Time");

    //setting tags back to true
    buildFaceNormals(meshLab);
    buildVertexNormals(meshLab);
    mesh.geometry.dynamic = true;
    mesh.geometry.verticesNeedUpdate = true;
    mesh.geometry.nomalsNeedUpdate = true;

    createMesh(mesh, meshLab);
}
    


    
