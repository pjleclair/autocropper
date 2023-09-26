//import react hooks
import {useState, useEffect, useRef} from "react"

//import faceapi
import * as faceapi from "face-api.js"

const AutoCropper = () => {

    //initialize state
    const [files, setFiles] = useState(null)
    const [fileIndex,setFileIndex] = useState(null)
    const [currentImg, setCurrentImg] = useState('')
    const [imgName, setImgName] = useState([])
    const [errFiles, setErrFiles] = useState([])
    const [isProcessed, setIsProcessed] = useState(false)
    const [headshots, setHeadShots] = useState([])

    //initialize canvas & image refs
    const canvasRef = useRef()
    const imgRef = useRef()


    //effect fires on first render
    useEffect(() => {
        //load faceapi models
        const loadModels = async () => {
            
            //set file path to faceapi models
            const MODEL_URL = process.env.PUBLIC_URL + '/models'

            //try to load models
            try {
                await Promise.all([
                    // models getting from public/model directory
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
                ])
                console.log("success", "/models")
            } catch (e) {console.error(e)}; //catch and log errors
        }
        loadModels();
    },[])

    useEffect(()=>{
        try {
            if (imgRef.current){
                imgRef.current.onload = async () => {
                    let newHeadshots = []
                    try {
                        newHeadshots = await handleImgLoad()
                    } catch (e) {
                        console.log('error in handleImgLoad')
                    }
                    setHeadShots(prevHeadshots => [...prevHeadshots,...newHeadshots].flat())
                    if (newHeadshots.length > 0) {
                        const newImgName = (files[fileIndex].name.split('.'))[0]
                        setImgName(prevState => [...prevState,newImgName])
                    } else {
                        const newImgName = (files[fileIndex].name)
                        setErrFiles(prevState => [...prevState,newImgName])
                    }
                    setFileIndex(prevFileIndex => prevFileIndex + 1)
                }
            }
        } catch (e) {
            console.log('loading image failed',e)
        }
    },[currentImg])

    useEffect(() => {
        if (fileIndex !== null)
            processImages()
    },[fileIndex])

    const handleImgLoad = async () => {
        return new Promise(async (resolve,reject)=>{
            try {
                const headshots = await cropPhoto()
                resolve(headshots)
            } catch (e) {
                console.error("Fail at cropPhoto",e)
            }
        })
    }

    const handleUpload = (e) => {
        setFiles(e.target.files)
        setFileIndex(0)
    }

    const cropPhoto = async () => {
        return new Promise(async (resolve,reject) => {
            //take the current img and create a canvas, set as canvasRef
            canvasRef.current.innerHTML = faceapi.createCanvasFromMedia(
                imgRef.current
            )

            //set displaySize (tbd)
            const displaySize = {
                width: imgRef.current.width,
                height: imgRef.current.height
            }

            //match dimensions and detect a face, then resize
            faceapi.matchDimensions(canvasRef.current, displaySize)
            const detections = await faceapi.detectSingleFace(
                imgRef.current,
                new faceapi.TinyFaceDetectorOptions()
            )

            //if a face is detected, draw a rectangle and log dimensions
            if (detections !== undefined) {
                const resizeDetections = faceapi.resizeResults(detections,displaySize)
                console.log(resizeDetections.box)
                console.log(detections.box)
                //draw a rectangle on the canvas using detected face
                canvasRef.current
                    .getContext("2d")
                    .clearRect(0,0,displaySize.width,displaySize.height)
                faceapi.draw.drawDetections(canvasRef.current, resizeDetections)
                
                //log dimensions
                console.log(
                    `Width ${detections.box._width} and Height ${detections.box._height}`
                )

                const maxSize = Math.max(detections.box.width,detections.box.height)


                //extract face from drawn rectangle
                const headshots = await extractFaceFromBox(imgRef.current, {
                    x: detections.box.x - (maxSize - detections.box.width) / 2,
                    y: detections.box.y - (maxSize - detections.box.height) / 2,
                    width: maxSize,
                    height: maxSize
                })
                resolve(headshots)
            } else {
                console.log(
                    `Error! No face detected in ${currentImg}`
                )
                resolve([])
            }
        })
    }

    const extractFaceFromBox = async (imgRef, box) => {
        return new Promise (async (resolve,reject) => {
            //draw rectangle using box dimensions from detected face, adjusted
            const regionsToExtract = [
                new faceapi.Rect(box.x-50,box.y-125,box.width+100,box.height+150)
            ]

            //extract face
            let faceImages = await faceapi.extractFaces(imgRef,regionsToExtract)
            
            //if no face, log error, otherwise set headshot to extracted face(s) and log it
            if (faceImages.length === 0) {
                console.log('No face found :(')
                resolve([])
            } else {
                const newHeadshots = []
                faceImages.forEach((cnv) => {
                    newHeadshots.push(cnv.toDataURL())
                })
                console.log('Face found')
                resolve(newHeadshots)
            }
        })
    }

    const savePhotos = async (headshots) => {
        return new Promise(async (resolve,reject)=>{
            let i = 0
            for (let img of headshots) {
                console.log(img)
                const link = document.createElement('a')
                link.href = img
                link.download = imgName[i] + '-cropped'
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                i++
            }
            resolve()
        })
    }

    const processImages = async () => {
        if ((fileIndex !== null) && (fileIndex < files.length)) {
            //if file index is initiated and not beyond length of files,
            //update currentImg url and add file name to imgs
            const url = URL.createObjectURL(files[fileIndex])
            setCurrentImg(url)
        } else if ((files !== null) && (fileIndex == files.length)) {
            setIsProcessed(true)
        }
    }

    return(<div>
        <input onChange={handleUpload} name="files" type="file" multiple="multiple"/>
        {(headshots.length > 0) && <button onClick={()=>{savePhotos(headshots)}}>Save</button>}
        <div style={{
            display:'flex',
            justifyContent:'center',

        }}>
            <img ref={imgRef} src={currentImg} style={{display:'none'}} crossOrigin="anonymous" alt='headshot'/>
            <canvas ref={canvasRef} style={{position:'absolute',display:'none'}}/>
            {/* after confirming crop is working: style={{display:'none'}} */}
        </div>
        {(isProcessed && headshots.length > 0) ? <h2 style={{color:'green'}}>File processing completed!</h2>
        : (isProcessed && <h2 style={{color:'red'}}>No faces detected.</h2>)}
        {(errFiles.length > 0) &&
            <div>Unable to detect a face in the following files:
                <ul>
                    {errFiles.map((name,i)=>{
                        return <li key={i}>{name}</li>
                    })}
                </ul>
            </div>}
        {(headshots.length > 0) && 
            <div>
                <h2>Headshots:</h2>
                {headshots.map((img,i) => <img key={i} src={img}/>)}
            </div>
        }
    </div>)
}

export default AutoCropper