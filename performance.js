
// Constants
var STD_PRESSURE = 1013; // hPa
var STD_HECTOPASCAL_HEIGHT = 27; // ft
var stdVy = 84
var stdVySe = 84
var stdVx = 72
var stdVxSe = 83

// Flags
var useFL = false;
var usePavedRWY = true;
var useSoftSfc = false;
var useSnowCorrection = false;
var useSlope = false;
var useWindComponent = true;
var useIncreaedAppSpeed = true;
var useMSAROC = false;
var useCalculatedClimbSpeedsInGradients = false;


// Global Inputs
var elevationInput,
    temperatureInput,
    pressureInput,
    windDirInput,
    windSpdInput,
    rwyDirInput,
    weightInput,
    cruiseInput,
    msaInput;

$(document).ready(function()
{
    $('#performanceForm input').on('change', function(e)
    {
        calculateFromInputs();
        MathJax.typeset();
    });
});

function calculateFromInputs()
{
    elevationInput = parseInt($('#performanceForm input[name="elevationInput"]').val(), 10),
    temperatureInput = parseInt($('#performanceForm input[name="temperatureInput"]').val(), 10),
    pressureInput  = parseInt($('#performanceForm input[name="pressureInput"]').val(), 10),
    cruiseInput    = parseInt($('#performanceForm input[name="cruiseAltInput').val(), 10),
    msaInput       = parseInt($('#performanceForm input[name="msaInput').val(), 10),
    windDirInput   = parseInt($('#performanceForm input[name="windDirInput"]').val(), 10),
    windSpdInput   = parseInt($('#performanceForm input[name="windSpdInput"]').val(), 10),
    rwyDirInput    = parseInt($('#performanceForm input[name="rwyDirInput"]').val(), 10),
    weightInput    = window.acTotalMass;

    if (
        (isNaN(elevationInput)) ||
        (isNaN(temperatureInput)) ||
        (isNaN(pressureInput)) ||
        (isNaN(cruiseInput)) ||
        (isNaN(msaInput)) ||
        (isNaN(windDirInput)) ||
        (isNaN(windSpdInput)) ||
        (isNaN(rwyDirInput)) ||
        (weightInput == null)
    ) {

        var takeOffLandingUIPairs = [
            ['to-groundroll', null, 'm'],
            ['to-distance', null, 'm'],
            ['ldg-groundroll', null, 'm'],
            ['ldg-distance', null, 'm']
        ];
    
        updateUIValues(takeOffLandingUIPairs);

        return false;
    }

    // Temp ISA Deviation
    var tempIsaDeviation = temperatureInput - 15;

    // Calculate pressure altitude of AD elevation.
    var pressureElevation = elevationInput,
        pressureAltitude  = cruiseInput;

    if (pressureInput != STD_PRESSURE) {

        pressureElevation = toPressureAltitude(elevationInput);

        // If we use FL we don't correct for pressure.
        if (!useFL) {
            pressureAltitude = toPressureAltitude(cruiseInput);
        } else {
            pressureAltitude = cruiseInput * 100;
        }

        console.log('PA', pressureAltitude);

        // Pressure Elevation must not be less than 0, no data in matrix below 0.
        if (pressureElevation < 0) {
            pressureElevation = 0;
        }
    }

    var data = calculateAll(pressureElevation, pressureAltitude, msaInput, tempIsaDeviation, weightInput);
    console.log(data);

    var temperatures = Object.keys(data.takeoff.uncorrectedGround.data['1D1']);
    var weights = Object.keys(data.takeoff.uncorrectedGround.data['2D']);
    console.log(weights);

    var takeOffLandingUIPairs = {
        'to-groundroll': ['to-groundroll', Math.ceil(data.takeoff.groundroll), 'm'],
        'to-distance': ['to-distance', Math.ceil(data.takeoff.distance), 'm'],
        'ldg-groundroll': ['ldg-groundroll', Math.ceil(data.landing.groundroll), 'm'],
        'ldg-distance': ['ldg-distance', Math.ceil(data.landing.distance), 'm'],
        'oei-serviceceil': ['oei-serviceceil', ceilingCheck(data.OEIserviceCeiling), 'ft'],
        'oei-absceil': ['oei-absceil', ceilingCheck(data.OEIabsoluteCeiling), 'ft'],
        'vyse': ['vyse', Math.round(data.VySe), 'kias'],
        'roc-vyse': ['roc-vyse', Math.floor(data.rocVySe), 'fpm'],
        'grad-vyse': ['grad-vyse',(Math.floor(data.gradVySe * 10000)/100),'%'],
        'angle-vyse': ['angle-vyse',(Math.floor(data.angleVySe * 100)/100),'&#176'],
        'vy': ['vy',Math.round(data.Vy),'kias'],
        'roc-vy': ['roc-vy', Math.floor(data.rocVy), 'fpm'],
        'grad-vy': ['grad-vy',(Math.floor(data.gradVy * 10000)/100),'%'],
        'angle-vy': ['angle-vy',(Math.floor(data.angleVy * 100)/100),'&#176'],
        'o-vy': ['to-vy',Math.round(data.toVy),'kias'],
        'to-roc-vy': ['to-roc-vy',Math.round(data.toRocVy),'fpm'],
        'to-grad-vy': ['to-grad-vy',(Math.floor(data.toGradVy * 10000)/100),'%'],
        //'to-angle-vy': ['to-angle-vy',(Math.floor(data.angleToVy * 100)/100),'&#176'],   //Calculation not yet made
        'vxse': ['vxse', Math.round(data.VxSe), 'kias'],
        'roc-vxse': ['roc-vxse', Math.floor(data.rocVxSe), 'fpm'],
        'grad-vxse': ['grad-vxse',(Math.floor(data.gradVxSe * 10000)/100),'%'],
        'angle-vxse': ['angle-vxse',(Math.floor(data.angleVxSe * 100)/100),'&#176'],
        'vx': ['vx',Math.round(data.Vx),'kias'],
        'roc-vx': ['roc-vx', Math.floor(data.rocVx), 'fpm'],
        'grad-vx': ['grad-vx',(Math.floor(data.gradVx * 10000)/100),'%'],
        'angle-vx': ['angle-vx',(Math.floor(data.angleVx * 100)/100),'&#176'],
        'to-vx': ['to-vx',Math.round(data.toVx),'kias'],
        'to-roc-vx': ['to-roc-vx',Math.round(data.toRocVx),'fpm'],
        'to-grad-vx': ['to-grad-vx',(Math.floor(data.toGradVx * 10000)/100),'%'],
        //'to-angle-vx': ['to-angle-vx',(Math.floor(data.angleToVx * 100)/100),'&#176'],   //Calculation not yet made
        'useMSAOrNotTxt': ['useMSAOrNotTxt', (useMSAROC ? 'MSA' : '2/3 cruise alt.'), ''],

        
        'to-temp1': ['to-temp1', data.takeoff.uncorrectedGround.keys.temp1, '&deg;C'],
        'to-temp2': ['to-temp2', data.takeoff.uncorrectedGround.keys.temp2, '&deg;C'],
        'to-temp3': ['to-temp3', data.takeoff.uncorrectedGround.keys.temp3, '&deg;C'],
        'to-alt1': ['to-alt1', data.takeoff.uncorrectedGround.keys.alt1, 'ft'],
        'to-alt2': ['to-alt2', data.takeoff.uncorrectedGround.keys.alt2, 'ft'],
        'to-alt3': ['to-alt3', data.takeoff.uncorrectedGround.keys.alt3, 'ft'],
        'to-mass1': ['to-mass1', data.takeoff.uncorrectedGround.keys.mass1, 'kg'],
        'to-mass2': ['to-mass2', data.takeoff.uncorrectedGround.keys.mass2, 'kg'],
        'to-mass3': ['to-mass3', data.takeoff.uncorrectedGround.keys.mass3, 'kg'],

        'to-g-w1-alt1-temp1': ['to-g-w1-alt1-temp1', Math.ceil(data.takeoff.uncorrectedGround.data['1D1'][temperatures[0]+'-raw'][1]), 'm'],
        'to-g-w1-alt1-temp2': ['to-g-w1-alt1-temp2', Math.ceil(data.takeoff.uncorrectedGround.data['1D1'][temperatures[1]+'-raw'][1]), 'm'],
        'to-g-w1-alt2-temp1': ['to-g-w1-alt2-temp1', Math.ceil(data.takeoff.uncorrectedGround.data['1D1'][temperatures[0]+'-raw'][0]), 'm'],
        'to-g-w1-alt2-temp2': ['to-g-w1-alt2-temp2', Math.ceil(data.takeoff.uncorrectedGround.data['1D1'][temperatures[1]+'-raw'][0]), 'm'],
        'to-g-w1-alt3-temp1': ['to-g-w1-alt3-temp1', Math.ceil(data.takeoff.uncorrectedGround.data['1D1'][temperatures[0]]), 'm'],
        'to-g-w1-alt3-temp2': ['to-g-w1-alt3-temp2', Math.ceil(data.takeoff.uncorrectedGround.data['1D1'][temperatures[1]]), 'm'],
        'to-g-w1-alt3-temp3': ['to-g-w1-alt3-temp3', Math.ceil(data.takeoff.uncorrectedGround.data['2D'][weights[1]]), 'm'],

        'to-g-w2-alt1-temp1': ['to-g-w2-alt1-temp1', Math.ceil(data.takeoff.uncorrectedGround.data['1D2'][temperatures[0]+'-raw'][1]), 'm'],
        'to-g-w2-alt1-temp2': ['to-g-w2-alt1-temp2', Math.ceil(data.takeoff.uncorrectedGround.data['1D2'][temperatures[1]+'-raw'][1]), 'm'],
        'to-g-w2-alt2-temp1': ['to-g-w2-alt2-temp1', Math.ceil(data.takeoff.uncorrectedGround.data['1D2'][temperatures[0]+'-raw'][0]), 'm'],
        'to-g-w2-alt2-temp2': ['to-g-w2-alt2-temp2', Math.ceil(data.takeoff.uncorrectedGround.data['1D2'][temperatures[1]+'-raw'][0]), 'm'],
        'to-g-w2-alt3-temp1': ['to-g-w2-alt3-temp1', Math.ceil(data.takeoff.uncorrectedGround.data['1D2'][temperatures[0]]), 'm'],
        'to-g-w2-alt3-temp2': ['to-g-w2-alt3-temp2', Math.ceil(data.takeoff.uncorrectedGround.data['1D2'][temperatures[1]]), 'm'],
        'to-g-w2-alt3-temp3': ['to-g-w2-alt3-temp3', Math.ceil(data.takeoff.uncorrectedGround.data['2D'][weights[0]]), 'm'],

        'to-g-w3-alt3-temp3': ['to-g-w3-alt3-temp3', Math.ceil(data.takeoff.uncorrectedGround.data['3D']['result']), 'm'],
    };

    updateUIValues(takeOffLandingUIPairs);

    $('.to-g-w1-temp1-equation').html(MathJax.tex2svg('groundroll_{'+ takeOffLandingUIPairs['to-mass1'][1] +'kg ,'+ takeOffLandingUIPairs['to-temp1'][1] +'^\\circ C , '+ takeOffLandingUIPairs['to-alt3'][1] +'ft } = \\frac{ '+ takeOffLandingUIPairs['to-g-w1-alt2-temp1'][1] +'m - '+ takeOffLandingUIPairs['to-g-w1-alt1-temp1'][1] +'m }{ '+ takeOffLandingUIPairs['to-alt2'][1] +'ft - '+ takeOffLandingUIPairs['to-alt1'][1] +'ft } \\cdot ('+ takeOffLandingUIPairs['to-alt3'][1] +'ft - '+ takeOffLandingUIPairs['to-alt1'][1] +'ft) + '+ takeOffLandingUIPairs['to-g-w1-alt1-temp1'][1] +'m = '+ takeOffLandingUIPairs['to-g-w1-alt3-temp1'][1] +'m', {display: true}));
    $('.to-g-w1-temp2-equation').html(MathJax.tex2svg('groundroll_{'+ takeOffLandingUIPairs['to-mass1'][1] +'kg ,'+ takeOffLandingUIPairs['to-temp2'][1] +'^\\circ C , '+ takeOffLandingUIPairs['to-alt3'][1] +'ft } = \\frac{ '+ takeOffLandingUIPairs['to-g-w1-alt2-temp2'][1] +'m - '+ takeOffLandingUIPairs['to-g-w1-alt1-temp2'][1] +'m }{ '+ takeOffLandingUIPairs['to-alt2'][1] +'ft - '+ takeOffLandingUIPairs['to-alt1'][1] +'ft } \\cdot ('+ takeOffLandingUIPairs['to-alt3'][1] +'ft - '+ takeOffLandingUIPairs['to-alt1'][1] +'ft) + '+ takeOffLandingUIPairs['to-g-w1-alt1-temp2'][1] +'m = '+ takeOffLandingUIPairs['to-g-w1-alt3-temp2'][1] +'m', {display: true}));

    $('.to-g-w1-temp3-equation').html(MathJax.tex2svg('groundroll_{'+ takeOffLandingUIPairs['to-mass1'][1] +'kg ,'+ takeOffLandingUIPairs['to-temp3'][1] +'^\\circ C , '+ takeOffLandingUIPairs['to-alt3'][1] +'ft } = \\frac{ '+ takeOffLandingUIPairs['to-g-w1-alt3-temp2'][1] +'m - '+ takeOffLandingUIPairs['to-g-w1-alt3-temp1'][1] +'m }{ '+ takeOffLandingUIPairs['to-temp2'][1] +'^\\circ C - '+ takeOffLandingUIPairs['to-temp1'][1] +'^\\circ C } \\cdot ('+ takeOffLandingUIPairs['to-temp3'][1] +'^\\circ C - '+ takeOffLandingUIPairs['to-temp1'][1] +'^\\circ C) + '+ takeOffLandingUIPairs['to-g-w1-alt3-temp1'][1] +'m = '+ takeOffLandingUIPairs['to-g-w1-alt3-temp3'][1] +'m', {display: true}));

    $('.to-g-w2-temp1-equation').html(MathJax.tex2svg('groundroll_{'+ takeOffLandingUIPairs['to-mass2'][1] +'kg ,'+ takeOffLandingUIPairs['to-temp1'][1] +'^\\circ C , '+ takeOffLandingUIPairs['to-alt3'][1] +'ft } = \\frac{ '+ takeOffLandingUIPairs['to-g-w2-alt2-temp1'][1] +'m - '+ takeOffLandingUIPairs['to-g-w2-alt1-temp1'][1] +'m }{ '+ takeOffLandingUIPairs['to-alt2'][1] +'ft - '+ takeOffLandingUIPairs['to-alt1'][1] +'ft } \\cdot ('+ takeOffLandingUIPairs['to-alt3'][1] +'ft - '+ takeOffLandingUIPairs['to-alt1'][1] +'ft) + '+ takeOffLandingUIPairs['to-g-w2-alt1-temp1'][1] +'m = '+ takeOffLandingUIPairs['to-g-w2-alt3-temp1'][1] +'m', {display: true}));
    $('.to-g-w2-temp2-equation').html(MathJax.tex2svg('groundroll_{'+ takeOffLandingUIPairs['to-mass2'][1] +'kg ,'+ takeOffLandingUIPairs['to-temp2'][1] +'^\\circ C , '+ takeOffLandingUIPairs['to-alt3'][1] +'ft } = \\frac{ '+ takeOffLandingUIPairs['to-g-w2-alt2-temp2'][1] +'m - '+ takeOffLandingUIPairs['to-g-w2-alt1-temp2'][1] +'m }{ '+ takeOffLandingUIPairs['to-alt2'][1] +'ft - '+ takeOffLandingUIPairs['to-alt1'][1] +'ft } \\cdot ('+ takeOffLandingUIPairs['to-alt3'][1] +'ft - '+ takeOffLandingUIPairs['to-alt1'][1] +'ft) + '+ takeOffLandingUIPairs['to-g-w2-alt1-temp2'][1] +'m = '+ takeOffLandingUIPairs['to-g-w2-alt3-temp2'][1] +'m', {display: true}));

    $('.to-g-w2-temp3-equation').html(MathJax.tex2svg('groundroll_{'+ takeOffLandingUIPairs['to-mass2'][1] +'kg ,'+ takeOffLandingUIPairs['to-temp3'][1] +'^\\circ C , '+ takeOffLandingUIPairs['to-alt3'][1] +'ft } = \\frac{ '+ takeOffLandingUIPairs['to-g-w2-alt3-temp2'][1] +'m - '+ takeOffLandingUIPairs['to-g-w2-alt3-temp1'][1] +'m }{ '+ takeOffLandingUIPairs['to-temp2'][1] +'^\\circ C - '+ takeOffLandingUIPairs['to-temp1'][1] +'^\\circ C } \\cdot ('+ takeOffLandingUIPairs['to-temp3'][1] +'^\\circ C - '+ takeOffLandingUIPairs['to-temp1'][1] +'^\\circ C) + '+ takeOffLandingUIPairs['to-g-w2-alt3-temp1'][1] +'m = '+ takeOffLandingUIPairs['to-g-w2-alt3-temp3'][1] +'m', {display: true}));

    $('.to-g-w3-temp3-equation').html(MathJax.tex2svg('groundroll_{'+ takeOffLandingUIPairs['to-mass3'][1] +'kg ,'+ takeOffLandingUIPairs['to-temp3'][1] +'^\\circ C , '+ takeOffLandingUIPairs['to-alt3'][1] +'ft } = \\frac{ '+ takeOffLandingUIPairs['to-g-w1-alt3-temp3'][1] +'m - '+ takeOffLandingUIPairs['to-g-w2-alt3-temp3'][1] +'m }{ '+ takeOffLandingUIPairs['to-mass1'][1] +'kg - '+ takeOffLandingUIPairs['to-mass2'][1] +'kg } \\cdot ('+ takeOffLandingUIPairs['to-mass3'][1] +'kg - '+ takeOffLandingUIPairs['to-mass2'][1] +'kg) + '+ takeOffLandingUIPairs['to-g-w2-alt3-temp3'][1] +'m = '+ takeOffLandingUIPairs['to-g-w3-alt3-temp3'][1] +'m', {display: true}));
}

function ceilingCheck(ceiling)
{
    var output = Math.floor(ceiling.ceiling);

    if (ceiling.isTopOfData) {
        output = '> '+ ceiling.ceiling;
    }

    return output;
}

function updateUIValues(dataset)
{
    for (var i in dataset) {
        var item    = dataset[i],
            element = $('.'+ item[0]),
            value   = item[1],
            suffix  = item[2];

        if (
            value === '' ||
            (typeof value == 'number' && isNaN(value)) ||
            value === null
        ) {
            value = '-';
        } else {
            value = value +' '+ suffix;
        }

        element.html(value);
    }
}

function getWindComponents()
{
    // Calculate HWC/TWC and XWC.
    var headwindComponent =  Math.cos(toRadians(windDirInput - rwyDirInput)) * windSpdInput;
    var crosswindComponent = Math.sin(toRadians(windDirInput - rwyDirInput)) * windSpdInput;

    if (isNaN(headwindComponent)) {
        headwindComponent = 0;
    }

    if (isNaN(crosswindComponent)) {
        crosswindComponent = 0;
    }

    return {
        'head': headwindComponent,
        'cross': crosswindComponent
    };
}

function toTrueAltitude(pa) {
    return pa + ((pressureInput - STD_PRESSURE) * STD_HECTOPASCAL_HEIGHT)
}

function toPressureAltitude(ta) {
    return ta - ((pressureInput - STD_PRESSURE) * STD_HECTOPASCAL_HEIGHT)
}

function toDegrees (angle) {
    return angle * (180 / Math.PI);
}

function toRadians (angle) {
    return angle * (Math.PI / 180);
}


// Functions for interpolation

function findKeysForInterpolation(needle, haystack)
{
    var largerThan = [],
        lessThan   = [];
        
    
    for (var i in haystack) {
        if (typeof haystack[i] == 'string' && haystack[i].toLowerCase() == 'spacing') {
            continue;
        }
        if (haystack[i] >= needle) {
            largerThan.push(parseInt(haystack[i], 10));
        } else {
            lessThan.push(parseInt(haystack[i], 10));
        }
    }

    return [Math.min(...largerThan), Math.max(...lessThan)];
}

function findDataValuesInDataset(needle, dataset, keys)
{
    var interpolateKeys = findKeysForInterpolation(needle, keys);

    var keyOne = interpolateKeys[0],
        keyTwo = interpolateKeys[1],
        valueOne = dataset[keyOne],
        valueTwo = dataset[keyTwo];

    return [valueOne, valueTwo];
}

function interpolate1D(needle, dataset, keys)
{
    var interpolateKeys = findKeysForInterpolation(needle, keys);

    var keyOne = interpolateKeys[0],
        keyTwo = interpolateKeys[1],
        valueOne = dataset[keyOne],
        valueTwo = dataset[keyTwo];

    return (valueTwo - valueOne) / (keyTwo - keyOne) * (needle - keyOne) + valueOne;    
}

function interpolate2D()
{
    // TODO..
}

function interpolate3D(pressureAltitudeInput, degreeInput, massInput, matrixData)
{
    var massKeys = Object.keys(matrixData),
        massKeys2 = findKeysForInterpolation(massInput, massKeys),
        mass1 = massKeys2[0],
        mass2 = massKeys2[1];

    var degreeKeys = Object.keys(matrixData[mass1]),
        degreeKeys2 = findKeysForInterpolation(degreeInput, degreeKeys),
        degree1 = degreeKeys2[0],
        degree2 = degreeKeys2[1];

    var pressureAltitudeKeys = Object.keys(matrixData[mass1][degree1]),
        pressureAltitudeKeys2 = findKeysForInterpolation(pressureAltitudeInput / matrixData.spacing, pressureAltitudeKeys),
        pressureAltitude1 = pressureAltitudeKeys2[0],
        pressureAltitude2 = pressureAltitudeKeys2[1];

    var pressureAltitudeKeys = [pressureAltitude1, pressureAltitude2];


    var interpolationData1D1 = {
        [degree1]: interpolate1D(pressureAltitudeInput / matrixData.spacing, matrixData[mass1][degree1], pressureAltitudeKeys),
        [degree2]: interpolate1D(pressureAltitudeInput / matrixData.spacing, matrixData[mass1][degree2], pressureAltitudeKeys),
        
        [degree1 +'-raw']: findDataValuesInDataset(pressureAltitudeInput / matrixData.spacing, matrixData[mass1][degree1], pressureAltitudeKeys),
        [degree2 +'-raw']: findDataValuesInDataset(pressureAltitudeInput / matrixData.spacing, matrixData[mass1][degree2], pressureAltitudeKeys)
    };

    var interpolationData1D2 = {
        [degree1]: interpolate1D(pressureAltitudeInput / matrixData.spacing, matrixData[mass2][degree1], pressureAltitudeKeys),
        [degree2]: interpolate1D(pressureAltitudeInput / matrixData.spacing, matrixData[mass2][degree2], pressureAltitudeKeys),

        [degree1 +'-raw']: findDataValuesInDataset(pressureAltitudeInput / matrixData.spacing, matrixData[mass2][degree1], pressureAltitudeKeys),
        [degree2 +'-raw']: findDataValuesInDataset(pressureAltitudeInput / matrixData.spacing, matrixData[mass2][degree2], pressureAltitudeKeys)
    };

    var interpolationData2D = {
        [mass1]: interpolate1D(degreeInput, interpolationData1D1, degreeKeys2),
        [mass2]: interpolate1D(degreeInput, interpolationData1D2, degreeKeys2),

        [mass1 +'-raw']: findDataValuesInDataset(degreeInput, interpolationData1D1, degreeKeys2),
        [mass2 +'-raw']: findDataValuesInDataset(degreeInput, interpolationData1D2, degreeKeys2),
    };

    var interpolationData3D = {
        'result': interpolate1D(massInput, interpolationData2D, massKeys2),
        ['raw']: findDataValuesInDataset(massInput, interpolationData2D, massKeys2)
    }

    return {
        'result': interpolationData3D['result'],
        'data': {
            '1D1': interpolationData1D1,
            '1D2': interpolationData1D2,
            '2D': interpolationData2D,
            '3D': interpolationData3D,
        },
        'keys': {
            'mass1': mass1,
            'mass2': mass2,
            'mass3': massInput,
            'temp1': degree2,
            'temp2': degree1,
            'temp3': degreeInput,
            'alt1': pressureAltitude2 * matrixData.spacing,
            'alt2': pressureAltitude1 * matrixData.spacing,
            'alt3': pressureAltitudeInput,
            'altSpacing': matrixData.spacing
        }
    };
};

function calculateGradient(roc,gs){
    return roc / (gs / 60 * 6076)
}

// Functions for specifics

//Takeoff distances
function calculateTakeOffGroundRoll(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, takeOffGroundMatrix);
}

function calculateTakeOffDist(pa,isaDeviation,tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa,sfcTemp,tom,takeOffFiftyFtMatrix)
}

//Landing distances
function calculateLandingGroundRoll(pa,isaDeviation,tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa,sfcTemp,tom,landingGroundMatrix)
}

function calculateLandingDist(pa,isaDeviation,tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa,sfcTemp,tom,landingFiftyFtMatrix)
}

//Climb speeds
function calculateToVy(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, takeoffClimbVyMatrix)
}

function calculateToVx(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, takeoffClimbVxMatrix)
}

function calculateVy(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, climbVyMatrix)
}

function calculateVx(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, climbVxMatrix)
}

function calculateVySe(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, climbVySeMatrix)
}

function calculateVxSe(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, climbVxSeMatrix)
}

//Rates of climb
function calculateToROCVy(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, takeoffROCVyMatrix)
}

function calculateToROCVx(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, takeoffROCVxMatrix)
}

function calculateRocVy(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, ROCVyMatrix)
}

function calculateRocVx(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15
    return interpolate3D(pa, sfcTemp, tom, ROCVxMatrix)
}

function calculateRocVySe(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15;
    return interpolate3D(pa, sfcTemp, tom, ROCVySeMatrix);
}

function calculateRocVxSe(pa, isaDeviation, tom) {
    var sfcTemp = isaDeviation + 15;
    return interpolate3D(pa, sfcTemp, tom, ROCVxSeMatrix)
}

//Gradients
function calculateToGradientVy(pa, isaDeviation, tom) {
    var ias = calculateToVy(pa, isaDeviation, tom).result
    if (!useCalculatedClimbSpeedsInGradients) {
        ias = stdVy
    }
    var roc = calculateToROCVy(pa, isaDeviation, tom).result
    return calculateGradient(roc, ias)
}

function calculateToGradientVx(pa, isaDeviation, tom) {
    var ias = calculateToVx(pa, isaDeviation, tom).result
    if (!useCalculatedClimbSpeedsInGradients) {
        ias = stdVx
    }
    var roc = calculateToROCVx(pa, isaDeviation, tom).result
    return calculateGradient(roc, ias)
}

function calculateGradientVy(pa, isaDeviation, tom) {
    var ias = calculateVy(pa, isaDeviation, tom).result
    if (!useCalculatedClimbSpeedsInGradients) {
        ias = stdVy
    }
    var roc = calculateRocVy(pa, isaDeviation, tom).result
    return calculateGradient(roc, ias)
}

function calculateGradientVx(pa, isaDeviation, tom) {
    var ias = calculateVx(pa, isaDeviation,tom) .result
    if (!useCalculatedClimbSpeedsInGradients) {
        ias = stdVx
    }
    var roc = calculateRocVx(pa, isaDeviation, tom).result
    return calculateGradient(roc, ias)
}

function calculateGradientVySe(pa, isaDeviation, tom) {
    var ias = calculateVySe(pa, isaDeviation, tom).result
    if (!useCalculatedClimbSpeedsInGradients) {
        ias = stdVySe
    }
    var roc = calculateRocVySe(pa, isaDeviation, tom, true).result
    return calculateGradient(roc, ias)
}

function calculateGradientVxSe(pa, isaDeviation, tom) {
    var ias = calculateVxSe(pa, isaDeviation, tom).result
    if (!useCalculatedClimbSpeedsInGradients) {
        ias = stdVxSe
    }
    var roc = calculateRocVxSe(pa, isaDeviation, tom).result
    return calculateGradient(roc, ias)
}

//Angles
function calculateAngle(grad){
    return toDegrees(Math.atan(grad))
}


//Ceilings
function calculateOEIceiling(isaDeviation, tom) {
    var serviceCeiling = 7000;
    var fpm = 1;
    while (fpm < 50) {
        fpm = calculateRocVySe(serviceCeiling, isaDeviation, tom).result;
        
        if (fpm < 50) {
            serviceCeiling -= 1;
        }
    }

    var isTopOfData = (serviceCeiling == 7000)

    //convert pressure altitude to true altitude
    serviceCeiling = toTrueAltitude(serviceCeiling)
    
    return {
        'ceiling': serviceCeiling,
        'isTopOfData': isTopOfData
    };
}

function calculateOEIabsoluteCeiling(isaDeviation, tom) {
    var absoluteCeiling = 7000;
    var fpm = -1;
    while (fpm < 0) {
        fpm = calculateRocVySe(absoluteCeiling, isaDeviation, tom).result;
        
        if (fpm < 0) {
            absoluteCeiling -= 1;
        }
    }

    var isTopOfData = (absoluteCeiling == 7000)

    //convert pressure altitude to true altitude
    absoluteCeiling = toTrueAltitude(absoluteCeiling)

    return {
        'ceiling': absoluteCeiling,
        'isTopOfData': isTopOfData
    };
}

//Corrections
function takeoffCorrectedCalculations(pa, isaDeviation, tom, slope)
{
    var groundroll = calculateTakeOffGroundRoll(pa, isaDeviation, tom);
    var distance = calculateTakeOffDist(pa, isaDeviation, tom);
    var altitudes = findKeysForInterpolation(pa, landingGroundMatrix[1230][0]);
    
    var windCorrection;
    if (useWindComponent) {
        //Correction for wind component, according to AFM
        var windComponents = getWindComponents();
        if (windComponents.head > 0) {                           //If there is headwind
            windCorrection = windComponents.head * -2.5;         //Remove 2,5m per kt
        } else {                                                 //Else (If there is tailwind)
            windCorrection = (windComponents.head * -1) * 10;    //Add 10m per kt
        }    
    }
    

    //Correction for paved runway, according to AFM
    var pavedRwyCorrection = 0;
    if (usePavedRWY) {                                       //If runway is paved
        pavedRwyCorrection = groundroll.result * -0.06       //Remove 6% of Groundroll
    }

    var slopeCorrection = 0;
    if (useSlope) {
        //Correction for Runway slope, according to AFM
        if (slope > 0) {
            slopeCorrection = slope / 0.01 * 0.05 * groundroll.result;  //Add 5% of groundroll per 1% upslope
        }    
    }
    

    //Correction for soft surface, according to GreyBird procedure
    var softSfcCorrection = 0;
    if (useSoftSfc) {                                       //If the surface is soft
        softSfcCorrection = groundroll.result * 0.25;       //Add 25% of groundroll
    }

    /*
    TODO - Add Corrections for:
    Water & Slush (cm)
    Wet snow (cm)
    Frozen snow (cm)
    */

    var corrections = {
        'windCorrection': windCorrection,
        'pavedRwyCorretion': pavedRwyCorrection,
        'slopeCorrection': slopeCorrection,
        'softSfcCorrection': softSfcCorrection
    };

    var sumCorrections = 0;
    for (var i in corrections) {            //Sum of all corrections
        if (!isNaN(corrections[i])) {
            sumCorrections += corrections[i];
        }
    }

    return {
        'uncorrectedDist': distance,
        'uncorrectedGround': groundroll,
        'groundroll': ((groundroll.result + sumCorrections) * 1.25),   //Groundroll in meters
        'distance': ((distance.result + sumCorrections) * 1.25),       //Distance to 50ft in meters
        'corrections': corrections                                     //List of all corrections applied
    };
}

function landingCorrectedCalculations(pa, isaDeviation, tom, slope) {
    var groundroll = calculateLandingGroundRoll(pa, isaDeviation, tom);
    var distance = calculateLandingDist(pa, isaDeviation, tom);

    var windCorrection;
    if (useWindComponent) {
        //Correction for wind component, according to AFM
        var windComponents = getWindComponents()
        if (windComponents.head > 0) {                          //If there is headwind
            windCorrection = windComponents.head * -5;          //Remove 5m per kt
        }
        else {                                                  //Else (If there is tailwind)
            windCorrection = (windComponents.head * -1) * 11;   //Add 11m per kt
        }    
    }

    var appSpeedCorrection = 0
    //Correction for increased approach speed
    if (useIncreaedAppSpeed){
        appSpeedCorrection = 110                            //10 kts Increased approach speed calculated as tailwind of 10 kts
    }

    //Correction for paved runway, according to AFM
    var pavedRwyCorrection = 0;
    if (usePavedRWY) {                                       //If runway is paved
        pavedRwyCorrection = groundroll.result * -0.02       //Remove 2% of Groundroll
    }

    var slopeCorrection = 0;
    if (useSlope) {
        //Correction for Runway slope, according to GreyBird Procedures
        if (slope < 0) {                                                //if there is downslope
            slopeCorrection = slope / 0.02 * 0.10 * groundroll.result;  //Add 10% of groundroll per 2% upslope
        } 
    }
    
    //Correction for soft surface or snow, according to GreyBird procedure
    var softSfcCorrection = 0;
    if (useSoftSfc || useSnowCorrection) {                  //If the surface is soft, or there is snow
        softSfcCorrection = groundroll.result * 0.25;       //Add 25% of groundroll
    }

    var corrections = {
        'windCorrection': windCorrection,
        'pavedRwyCorretion': pavedRwyCorrection,
        'slopeCorrection': slopeCorrection,
        'softSfcCorrection': softSfcCorrection,
        'appSpeedCorrection': appSpeedCorrection
    };

    var sumCorrections = 0;
    for (var i in corrections){                 //Sum of all corrections
        if (!isNaN(corrections[i])) {
            sumCorrections += corrections[i];
        }
    }

    return {
        'uncorrectedDist': distance,
        'uncorrectedGround': groundroll,
        'groundroll': ((groundroll.result + sumCorrections) * 1.43),    //Groundroll in meters
        'distance': ((distance.result + sumCorrections) * 1.43),        //Distance from 50ft in meters
        'corrections': corrections                                      //List of all corrections applied
    };
}

function calculateAll(pe, pa, msa, isaDeviation, tom, useTwoThirds)
{
    var rocAltitude = msa;
    if (!useMSAROC) {
        rocAltitude = (pa - pe) / 3 * 2 + pe;
    }

    return {
        //Takeoff and landing distances
        'takeoff': takeoffCorrectedCalculations(pe, isaDeviation, tom, null),
        'landing': landingCorrectedCalculations(pe, isaDeviation, tom, null),

        //Climb performance numbers, all with max cont. power setting and gear up
        //Takeoff Vy (flaps takeoff)
        'toVy': calculateToVy(rocAltitude, isaDeviation, tom).result,
        'toRocVy': calculateToROCVy(rocAltitude, isaDeviation, tom).result,
        'toGradVy': calculateToGradientVy(rocAltitude, isaDeviation,tom),
        'toAngleVy': calculateAngle(calculateToGradientVy(rocAltitude,isaDeviation,tom)),
        //Takeoff Vx (flaps takeoff)
        'toVx': calculateToVx(rocAltitude, isaDeviation, tom).result,
        'toRocVx': calculateToROCVx(rocAltitude, isaDeviation, tom).result,
        'toGradVx': calculateToGradientVx(rocAltitude, isaDeviation, tom),
        'toAngleVx': calculateAngle(calculateToGradientVx(rocAltitude,isaDeviation,tom)),
        //Enroute Vy (flaps&gear up)
        'Vy': calculateVy(rocAltitude, isaDeviation,tom).result,
        'rocVy': calculateRocVy(rocAltitude, isaDeviation, tom).result,
        'gradVy': calculateGradientVy(rocAltitude, isaDeviation,tom),
        'angleVy': calculateAngle(calculateGradientVy(rocAltitude,isaDeviation,tom)),
        //Enroute Vx (flaps up)
        'Vx': calculateVx(rocAltitude, isaDeviation, tom).result,
        'rocVx': calculateRocVx(rocAltitude, isaDeviation, tom).result,
        'gradVx': calculateGradientVx(rocAltitude, isaDeviation,tom),
        'angleVx': calculateAngle(calculateGradientVx(rocAltitude,isaDeviation,tom)),
        //VySe (one engine inoperative, and feathered, flaps up)
        'VySe': calculateVySe(rocAltitude, isaDeviation, tom).result,
        'rocVySe': calculateRocVySe(rocAltitude, isaDeviation, tom, true).result,
        'gradVySe': calculateGradientVySe(rocAltitude,isaDeviation,tom),
        'angleVySe': calculateAngle(calculateGradientVySe(rocAltitude,isaDeviation,tom)),
        //VxSe (one engine inoperative, and feathered, flaps up)
        'VxSe': calculateVxSe(rocAltitude, isaDeviation, tom).result,
        'rocVxSe': calculateRocVxSe(rocAltitude, isaDeviation, tom).result,
        'gradVxSe': calculateGradientVxSe(rocAltitude, isaDeviation, tom),
        'angleVxSe': calculateAngle(calculateGradientVxSe(rocAltitude,isaDeviation,tom)),

        //Ceilings (one engine inoperative, and feathered, flaps up)
        'OEIserviceCeiling': calculateOEIceiling(isaDeviation,tom),
        'OEIabsoluteCeiling': calculateOEIabsoluteCeiling(isaDeviation,tom)
    };
}

/*
KNOWN BUGS:
There is something wrong with the "use msa for climb" flag, or with the 2/3 pa, it seems the calculations are off

*/