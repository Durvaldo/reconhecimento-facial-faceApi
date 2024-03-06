const cam = document.getElementById('cam')
const selectCam = document.getElementById('cam-selector')

const enableCameraOptions = () => {
    navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            if (Array.isArray(devices)) {
                devices.forEach(device => {
                    if (device.kind === 'videoinput') {
                        console.log(device)
                        const option = document.createElement('option')
                        option.value = device.deviceId
                        option.text = device.label
                        selectCam.appendChild(option)
                    }
                })
            }
        })
}

const startVideo = deviceId => {
    navigator.getUserMedia(
        {
            video: { deviceId }
        },
        stream => cam.srcObject = stream,
        error => console.error(error)
    )
}

selectCam.addEventListener('change', () => {
    if (selectCam.value != '') {
        startVideo(selectCam.value)
    }
})

const loadLabels = () => {
    const labels = ['Durvaldo Gonçalves Marques', 'James Herique']
    return Promise.all(labels.map(async label => {
        const descriptions = []
        for (let i = 1; i <= 5; i++) {
            const url = `/assets/lib/face-api/labels/${label}/${i}.png`
            const response = await fetch(url).then(r => r.blob())
            if (!response) continue

            const img = await faceapi.fetchImage(url)
            const detections = await faceapi
                .detectSingleFace(img)
                .withFaceLandmarks()
                .withFaceDescriptor()

            if (detections) {
                descriptions.push(detections.descriptor)
            }
        }
        return new faceapi.LabeledFaceDescriptors(label, descriptions)
    }))
}

Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/assets/lib/face-api/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/assets/lib/face-api/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/assets/lib/face-api/models'),
    faceapi.nets.ssdMobilenetv1.loadFromUri('/assets/lib/face-api/models'),
]).then(enableCameraOptions)

cam.addEventListener('play', async () => {
    const canvas = faceapi.createCanvasFromMedia(cam)
    var videoContainer = document.getElementById('video-container');
    videoContainer.appendChild(canvas);

    const displaySize = { width: cam.width, height: cam.height }
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
            new faceapi.draw.DrawTextField([
                `${label} (${parseInt(distance * 100, 10)})`
            ], box.topLeft
            )
                .draw(canvas)
        })
    }, 100)
})