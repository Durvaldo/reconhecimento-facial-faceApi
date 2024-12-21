const cam = document.getElementById('cam')
const loading_gif = document.getElementById('loading_gif')

const startVideo = () => {
    navigator.getUserMedia(
        {
            video: true
        },
        stream => cam.srcObject = stream,
        error => console.error(error)
    )
}

// // código para salvar por pastas
// const loadLabels = () => {
//     const labels = ['Durvaldo Gonçalves Marques', 'James Herique']
//     return Promise.all(labels.map(async label => {
//         const descriptions = []
//         for (let i = 1; i <= 5; i++) {
//             const url = `/assets/lib/face-api/labels/${label}/${i}.png`
//             const response = await fetch(url).then(r => r.blob())
//             if (!response) continue

//             const img = await faceapi.fetchImage(url)
//             const detections = await faceapi
//                 .detectSingleFace(img)
//                 .withFaceLandmarks()
//                 .withFaceDescriptor()

//             if (detections) {
//                 descriptions.push(detections.descriptor)
//             }
//         }
//         console.log(label, descriptions)
//         return new faceapi.LabeledFaceDescriptors(label, descriptions)
//     }))
// }

const loadLabels = async () => {
    const response = await fetch('assets/lib/face-api/labels/labels.json')
    const labels = await response.json()
    return Promise.all(Object.entries(labels).map(([labelKey, labelValue]) => {
        const label = labelValue.name
        const descriptions = [new Float32Array(labelValue.descriptor)]
        return new faceapi.LabeledFaceDescriptors(label, descriptions)
    }))
}

Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/assets/lib/face-api/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/assets/lib/face-api/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/assets/lib/face-api/models'),
    faceapi.nets.ssdMobilenetv1.loadFromUri('/assets/lib/face-api/models'),
]).then(startVideo)

cam.addEventListener('play', async () => {
    const canvas = faceapi.createCanvasFromMedia(cam)
    const camWidth = cam.getBoundingClientRect().width
    const camHeight = cam.getBoundingClientRect().height
    var videoContainer = document.getElementById('video-container')
    videoContainer.appendChild(canvas)

    const displaySize = { width: camWidth, height: camHeight }
    const labels = await loadLabels()

    faceapi.matchDimensions(canvas, displaySize)
    setInterval(async () => {
        const detections = await faceapi
            .detectAllFaces(cam, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptors()
        const resizedDetections = faceapi.resizeResults(detections, displaySize)
        const faceMatcher = new faceapi.FaceMatcher(labels, 0.6)
        const results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor))

        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
        faceapi.draw.drawDetections(canvas, resizedDetections)
        results.forEach((result, index) => {
            const box = resizedDetections[index].detection.box
            const { label, distance } = result
            console.log(label)
            new faceapi.draw.DrawTextField([
                `${label} (${parseInt(distance * 100, 10)})`
            ], box.topLeft
            )
                .draw(canvas)
        })
    }, 100)
    loading_gif.style.display = 'none'

})

const takePicture = async () => {
    const name = document.getElementById('person_name').value
    if (!name) {
        alert('Insira um nome')
        return
    }
    const canvas = document.createElement('canvas')
    canvas.width = cam.videoWidth
    canvas.height = cam.videoHeight
    canvas.getContext('2d').drawImage(cam, 0, 0)
    const url = canvas.toDataURL('image/jpeg')

    const img = await faceapi.fetchImage(url)
    const detections = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor()

    if (detections) {
        // transforma o descritor em array antes de colocar em JSON
        const descriptor = Array.from(detections.descriptor)
        const response = await fetch('assets/lib/face-api/labels/labels.json')
        const labels = await response.json()

        labels[Object.keys(labels).length] = {
            name,
            descriptor
        }
        // save the labels in a json file
        console.log(labels)
    } else {
        alert('Nenhum rosto detectado')
    }
}