'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let lighting;
let lightPosition = [0.0, 0.0, 0.0];

let Ka = 1.0;
let Kd = 1.0;
let Ks = 1.0;

function deg2rad(angle) {
    return angle * Math.PI / 180;
}
function redraw() {
    surface.BufferData(CreateSurfaceData());
    lighting.BufferData(CreateSurfaceLight(lightPosition));
    draw();
}


// Constructor
function Model(name) {
    this.name = name;
    
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();

    this.count = 0;
    this.countNormalization = 0;

    this.BufferData = function(data) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.vertices), gl.STREAM_DRAW);
        this.count = data.vertices.length / 3;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.normals), gl.STREAM_DRAW);
        

    }

    this.Draw = function() {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);

        gl.drawArrays(gl.TRIANGLES, 0, this.count);
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    // Location of the attribute variable in the shader program.
    this.iAttribNormalVertex = -1;

    this.iLightPosition = 1;
    this.iModelMatrixNormal = 1 

    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;
        //User settings
    this.iKa = -1;
    this.iKd = -1;
    this.iKs = -1;
    this.iShininess = -1;

    this.iAmbientColor = -1;
    this.iDiffuseColor = -1;

    this.iLighting = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(1, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* Set the values of the projection transformation */
    let projection = m4.orthographic(-2, 2, 
                                     -2, 2, 
                                      0, 16);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -14);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);

    const normal = m4.identity();
    m4.inverse(modelView, normal);
    m4.transpose(normal, normal);

    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normal);

    gl.uniform4fv(shProgram.iColor, [1, 1, 0, 1]);

    surface.Draw();
    // Draw the light sphere without modelView transformation
    lighting.Draw();
}


function CreateSurfaceData() {
    let vertexList = [];
    let normalList = [];

    let a = Number(document.getElementById('a').value);
    let b = Number(document.getElementById('b').value);
    let n = Number(document.getElementById('n').value);

    let u_min = Number(document.getElementById('u_min').value);
    let u_max = Number(document.getElementById('u_max').value);
    let v_min = Number(document.getElementById('v_min').value);
    let v_max = Number(document.getElementById('v_max').value);
    let step_v = Number(document.getElementById('step_v').value);
    let step_u = Number(document.getElementById('step_u').value);

    const countX = (u, v) => ((a + b * Math.sin(n * (u))) * Math.cos((u)) - v * Math.sin((u)))/4;
    const countY = (u, v) => ((a + b * Math.sin(n * (u))) * Math.sin((u)) + v * Math.cos((u)))/4;
    const countZ = (u) => (b * Math.cos(n * (u)))/4;
    const countVertex = (u,v) =>[countX(u,v),countY(u,v),countZ(u)];

    const countNormal =(u, v) => {
        
        let vertex = countVertex( u, v);
        let U = countVertex(u, v + 0.0001);
        let V = countVertex(u + 0.0001, v);
    
        let dU = [
            (vertex[0] - U[0]) / 0.0001,
            (vertex[1] - U[1]) / 0.0001,
            (vertex[2] - U[2]) / 0.0001
        ];
        let dV = [
            (vertex[0] - V[0]) / 0.0001,
            (vertex[1] - V[1]) / 0.0001,
            (vertex[2] - V[2]) / 0.0001
        ];
    
        return m4.normalize(m4.cross(dU, dV));
    }

    for (let u = u_min; u <=  u_max; u += step_u) {
        for (let v = v_min; v <= v_max; v += step_v) {
            let vertex1 = countVertex(u, v);
            let vertex2 = countVertex(u, v + 0.1);
            let vertex3 = countVertex(u + 0.1, v);
            let vertex4 = countVertex(u + 0.1, v + 0.1);

            let Normal1 = countNormal(u, v);
            let Normal2 = countNormal(u, v + 0.1);
            let Normal3 = countNormal(u + 0.1, v);
            let Normal4 = countNormal(u + 0.1, v + 0.1);

            vertexList.push(...vertex1, ...vertex2, ...vertex3, ...vertex3, ...vertex2, ...vertex4);
            normalList.push(...Normal1, ...Normal2, ...Normal3, ...Normal3, ...Normal2, ...Normal4);
        }
    }

    for (let v = v_min; v <= v_max; v += step_v) {
        for (let u = u_min; u <=  u_max; u += step_u) {
            let vertex1 = countVertex(u, v);
            let vertex2 = countVertex(u, v + 0.1);
            let vertex3 = countVertex(u + 0.1, v);
            let vertex4 = countVertex(u + 0.1, v + 0.1);

            let Normal1 = countNormal(u, v);
            let Normal2 = countNormal(u, v + 0.1);
            let Normal3 = countNormal(u + 0.1, v);
            let Normal4 = countNormal(u + 0.1, v + 0.1);

            vertexList.push(...vertex1, ...vertex2, ...vertex3, ...vertex3, ...vertex2, ...vertex4);
            normalList.push(...Normal1, ...Normal2, ...Normal3, ...Normal3, ...Normal2, ...Normal4);
        }
    }

    return {vertices: vertexList, normals: normalList};
}

function animate() {
    movePointOnElipse(1.8, 1.2, 0.4); // Рух точки по колу з радіусом 2.0 та швидкістю 2.0
    requestAnimationFrame(animate);
}

function movePointOnElipse(a,b , speed) {
    let time = performance.now() * 0.005; 
    let phi = time * speed; 

    let newLightPosition = [
        a * Math.cos(phi),
        b * Math.sin(phi),
        0
    ];

    surface.Draw();
    lighting.BufferData(CreateSurfaceLight(newLightPosition));
    gl.uniform3fv(shProgram.iLightPosition, newLightPosition);
    lighting.Draw();
}

function CreateSurfaceLight(lightPosition) {
    let radius = 0.1;

    let CalculateVertexSphere = (theta, phi, radius) => {
        let x = lightPosition[0] + radius * Math.sin(theta) * Math.cos(phi);
        let y = lightPosition[1] + radius * Math.sin(theta) * Math.sin(phi);
        let z = lightPosition[2] + radius * Math.cos(theta);
        return [x, y, z];
    }
    let vertexList = [];

    for (let phi = 0; phi <= Math.PI; phi += 0.1) {
        for (let theta = 0; theta <= 2 * Math.PI; theta += 0.1) {
            let vertex1 = CalculateVertexSphere(theta, phi, radius);
            let vertex2 = CalculateVertexSphere(theta, phi + 0.1, radius);
            let vertex3 = CalculateVertexSphere(theta + 0.1, phi, radius);
            let vertex4 = CalculateVertexSphere(theta + 0.1, phi + 0.1, radius);

            vertexList.push(...vertex1, ...vertex2, ...vertex3, ...vertex3, ...vertex2, ...vertex4);
        }
    }
    return { vertices: vertexList, normals: vertexList};
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal = gl.getAttribLocation(prog, "normal");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iNormalMatrix = gl.getUniformLocation(prog, "NormalMatrix");
    shProgram.iTranslationMatrix = gl.getUniformLocation(prog, "TranslationMatrix");
    shProgram.iColor = gl.getUniformLocation(prog, "color");
    shProgram.iLightPosition = gl.getUniformLocation(prog, "lightPosition");
    shProgram.iLighting = gl.getUniformLocation(prog, "lighting");

    surface = new Model('Surface');
    surface.BufferData(CreateSurfaceData());

    lighting = new Model();
    lighting.BufferData(CreateSurfaceLight(lightPosition));

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    draw();
    animate();
}
