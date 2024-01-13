'use strict';

let gl;                         // The webgl context.
let surface;          // A surface model and lighting model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let sphere;
let userPoint;
let sphereCenter;
let angle;

let a = 2;
let b = 2;
let n = 1;
let u1, v1;
let u_min = 0;
let u_max = Math.PI * 2;
let v_min = 0;
let v_max = 2;
let step_v = 0.1;
let step_u = 0.1;

const countX = (u, v) => ((a + b * Math.sin(n * (u))) * Math.cos((u)) - v * Math.sin((u))) / 4;
const countY = (u, v) => ((a + b * Math.sin(n * (u))) * Math.sin((u)) + v * Math.cos((u))) / 4;
const countZ = (u) => (b * Math.cos(n * (u))) / 4;
const countVertex = (u, v) => [countX(u, v), countY(u, v), countZ(u)];


// Constructor
function Model(name) {
    this.name = name;

    this.iVertexBuffer = gl.createBuffer();
    this.iVertexTextureBuffer = gl.createBuffer();

    this.count = 0;
    this.textureCount = 0;

    this.BufferData = function (data) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.vertices), gl.STREAM_DRAW);
        this.count = data.vertices.length / 3;

    }

    this.TextureBufferData = function (vertices) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexTextureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        this.textureCount = vertices.length / 2;
    }

    this.Draw = function () {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexTextureBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertexTexture, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertexTexture);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
    }


    this.DrawSphere = function () {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    // Location of the attribute variable in the shader program.
    this.iAttribVertexTexture = -1;
    this.iModelViewProjectionMatrix = -1;

    this.iTMU = -1;
    this.iUserPoint = -1;
    this.iAngle = 0;
    this.iTranslateSphere = -1;

    this.Use = function () {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(1., 1., 1., 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let projection = m4.orthographic(-5, 5, -5, 5, 0, 25);

    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -15);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    let modelViewProjection = m4.multiply(projection, matAccum1);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);

    gl.uniform1i(shProgram.iTMU, 0);
    gl.uniform2fv(shProgram.iUserPoint, [userPoint.u, userPoint.v]);
    gl.uniform1f(shProgram.iAngle, angle);
    gl.uniform1f(shProgram.iB, -1);

    gl.uniform3fv(shProgram.iTranslateSphere, [-0., -0., -0.])
    surface.Draw();

    let translate = countVertex(userPoint.u, userPoint.v)
    gl.uniform3fv(shProgram.iTranslateSphere, [translate[0], translate[1], translate[2]])
    gl.uniform1f(shProgram.iB, 1);
    sphere.DrawSphere();

}

function CreateSurfaceData() {
    let vertexList = [];

    for (let u = u_min; u <= u_max; u += step_u) {
        for (let v = v_min; v <= v_max; v += step_v) {
            let vertex1 = countVertex(u, v);
            let vertex2 = countVertex(u, v + 0.1);
            let vertex3 = countVertex(u + 0.1, v);
            let vertex4 = countVertex(u + 0.1, v + 0.1);
            vertexList.push(...vertex1, ...vertex2, ...vertex3, ...vertex3, ...vertex2, ...vertex4);
        }
    }

    return { vertices: vertexList };
}

function map(val, f1, t1, f2, t2) {
    let m = (val - f1) * (t2 - f2) / (t1 - f1) + f2;
    return Math.min(Math.max(m, f2), t2);
}

function CreateSurfaceTextureData() {
    let vertexTextureList = [];
    const INC = 0.01
    for (let u = u_min; u <= u_max; u += step_u) {
        for (let v = v_min; v <= v_max; v += step_v) {
            let u1 = map(u, 0, u_max, 0, 1)
            let v1 = map(v, 0, v_max, 0, 1)
            vertexTextureList.push(u1, v1)
            u1 = map(u + INC, 0, u_max, 0, 1)
            vertexTextureList.push(u1, v1)
            u1 = map(u, 0, u_max, 0, 1)
            v1 = map(v + INC, 0, v_max, 0, 1)
            vertexTextureList.push(u1, v1)
            u1 = map(u + INC, 0, u_max, 0, 1)
            v1 = map(v, 0, v_max, 0, 1)
            vertexTextureList.push(u1, v1)
            v1 = map(v + INC, 0, v_max, 0, 1)
            vertexTextureList.push(u1, v1)
            u1 = map(u, 0, u_max, 0, 1)
            v1 = map(v + INC, 0, v_max, 0, 1)
            vertexTextureList.push(u1, v1)
        }
    }
    return vertexTextureList;
}



function CreateSphereSurface() {
    let vertexList = [];
    let step = 0.01;
    let radius = 0.1;
    const getSphereVertex = (u, v) =>{
        return {
            x: sphereCenter[0] + radius * Math.cos(u) * Math.sin(v),
            y: sphereCenter[1] + radius * Math.sin(u) * Math.sin(v),
            z: sphereCenter[2] + radius * Math.cos(v)
        }
    }
    for (let u = 0; u < Math.PI * 2; u += step) {
        for (let v = 0; v < Math.PI; v += step) {
            let v1 = getSphereVertex(u, v);
            let v2 = getSphereVertex(u + step, v);
            let v3 = getSphereVertex(u, v + step);
            let v4 = getSphereVertex(u + step, v + step);

            vertexList.push(v1.x, v1.y, v1.z);
            vertexList.push(v2.x, v2.y, v2.z);
            vertexList.push(v3.x, v3.y, v3.z);
            vertexList.push(v3.x, v3.y, v3.z);
            vertexList.push(v2.x, v2.y, v2.z);
            vertexList.push(v4.x, v4.y, v4.z);
        }
    }

    return { vertices: vertexList };
}



function LoadTexture() {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const image = new Image();
    image.crossOrigin = 'anonymus';

    image.src = "texture.jpeg";
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image
        );
        draw()
    }
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribVertexTexture = gl.getAttribLocation(prog, "vertexTexture");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iTMU = gl.getUniformLocation(prog, 'TMU');
    shProgram.iUserPoint = gl.getUniformLocation(prog, 'userPoint');
    shProgram.iAngle = gl.getUniformLocation(prog, 'rotate');
    shProgram.iTranslateSphere = gl.getUniformLocation(prog, 'translateSphere');
    shProgram.iB = gl.getUniformLocation(prog, 'b');

    LoadTexture()
    surface = new Model('Surface');
    surface.BufferData(CreateSurfaceData());
    surface.TextureBufferData(CreateSurfaceTextureData());
    sphere = new Model('Sphere');
    sphere.BufferData(CreateSphereSurface());

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifi er for that program.  If an error occurs while compiling or
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
    userPoint = { u: 0.0, v: 0.0 }
    sphereCenter = countVertex(userPoint.u,userPoint.v);
    angle = 0.0;
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
}

// onmousemove = (e) => {
//     angle = map(e.clientX, 0, window.outerWidth, 0, 2 * Math.PI);
//     draw();
// };
function deg2rad(angle) {
    return angle * Math.PI / 180;
}

function updateAngle (e) {
    angle = deg2rad(e.target.value);
    draw();
}
window.onkeydown = (e) => {
    if (e.keyCode == 68) {
        userPoint.u = Math.max(userPoint.u + 0.1, 2 * Math.PI * 2);
    }
    else if (e.keyCode == 65) {
        userPoint.u = Math.max(userPoint.u - 0.1, 0);
    }
    else if (e.keyCode == 87) {
        userPoint.v = Math.max(userPoint.v + 0.1, 2);
    }
    else if (e.keyCode == 83) {
        userPoint.v = Math.max(userPoint.v - 0.1, 0);
    }
    CreateSphereSurface();
    draw();
}