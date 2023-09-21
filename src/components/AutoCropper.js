import {useState, useEffect} from "react"

const AutoCropper = () => {

    const [files, setFiles] = useState(null)

    useEffect(() => {
        if (files) {
            Array.from(files).forEach((img) => {
                //fill this in with face-api.js
                console.log(img)
            })
        }
    },[files])

    const handleUpload = (e) => {
        setFiles(e.target.files)
    }

    const cropPhoto = () => {

    }

    const savePhoto = () => {

    }

    return(<div>
        <input onChange={handleUpload} name="files" type="file" multiple="multiple"/>
    </div>)
}

export default AutoCropper