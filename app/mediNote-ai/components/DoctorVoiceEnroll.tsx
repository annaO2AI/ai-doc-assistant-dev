import React, { useState } from "react"
import { MicOff, Mic, AlertCircle, ArrowLeft, CheckCircle, X } from "lucide-react"
import { useAudioRecording } from "../hooks/useAudioRecording"
import { APIService } from "../service/api"
import Image from "next/image"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  id: number
  onSuccess?: () => void 
  showAsModal?: boolean
}

const convertToWav = async (audioBlob: Blob): Promise<Blob> => {
  // Decode the audio blob into an AudioBuffer, convert to WAV ArrayBuffer and return as Blob
  const arrayBuffer = await audioBlob.arrayBuffer();
  const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioCtx();
  // decodeAudioData may return a Promise or require callbacks; using promise form
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  const wavArrayBuffer = audioBufferToWav(audioBuffer);
  // Optionally close the audio context if supported
  if (typeof audioCtx.close === "function") {
    try {
      audioCtx.close();
    } catch {
      // ignore
    }
  }
  return new Blob([wavArrayBuffer], { type: "audio/wav" });
}

const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = buffer.length * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  let offset = 0;
  const writeString = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(offset + i, s.charCodeAt(i));
    }
    offset += s.length;
  };

  // RIFF chunk descriptor
  writeString("RIFF");
  view.setUint32(offset, totalSize - 8, true);
  offset += 4;
  writeString("WAVE");

  // fmt subchunk
  writeString("fmt ");
  view.setUint32(offset, 16, true); // Subchunk1Size (16 for PCM)
  offset += 4;
  view.setUint16(offset, 1, true); // AudioFormat (1 = PCM)
  offset += 2;
  view.setUint16(offset, numChannels, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, sampleRate * blockAlign, true);
  offset += 4;
  view.setUint16(offset, blockAlign, true);
  offset += 2;
  view.setUint16(offset, bitsPerSample, true);
  offset += 2;

  // data subchunk
  writeString("data");
  view.setUint32(offset, dataSize, true);
  offset += 4;

  // Write interleaved PCM samples
  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channelData.push(buffer.getChannelData(ch));
  }

  let pos = offset;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = channelData[ch][i];
      sample = Math.max(-1, Math.min(1, sample));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(pos, intSample, true);
      pos += 2;
    }
  }

  return arrayBuffer;
}

export const DoctorVoiceEnroll: React.FC<ModalProps> = ({ 
  isOpen,
  onClose, 
  id, 
  onSuccess,
  showAsModal = false
}) => {
  const {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    error: recordingError,
  } = useAudioRecording()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enrollmentStatus, setEnrollmentStatus] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)

  const handleStartEnrollment = async () => {
    setError(null)
    setShowSuccessPopup(false)
    setEnrollmentStatus(true)
    await startRecording()
  }

  const handleStopEnrollment = async () => {
    const audioBlob = await stopRecording()
    if (!audioBlob) {
      setError("Failed to capture audio")
      return
    }

    setIsLoading(true)
    try {
      const wavBlob = await convertToWav(audioBlob)
      const audioFile = new File([wavBlob], `${id}.wav`, { type: "audio/wav" })

      const response = await APIService.enrollDoctorVoice(id, audioFile)
      if (response) {
        if (onSuccess) {
          onSuccess()
        } else {
          setShowSuccessPopup(true)
        }
      }
    } catch (err) {
      setError(
        `Failed to enroll voice: ${err instanceof Error ? err.message : "Unknown error"}`
      )
    } finally {
      setIsLoading(false)
      setEnrollmentStatus(false)
    }
  }

  const handleSuccessContinue = () => {
    setShowSuccessPopup(false)
    onClose()
  }

  if (showAsModal) {
    return (
      <>
        {isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="flex justify-between items-center border-b p-4">
                <h3 className="text-lg font-semibold">Enroll Doctor Voice</h3>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="space-y-3 p-4">
                {!enrollmentStatus ? (
                  <button
                    onClick={handleStartEnrollment}
                    className="w-full flex items-center justify-center space-x-2 py-3 mb-4 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
                    disabled={isLoading}
                  >
                    <Mic className="w-5 h-5" />
                    <span>{isLoading ? "Processing..." : "Enroll Doctor Voice"}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStopEnrollment}
                    className="w-full flex items-center justify-center space-x-2 py-3 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                  >
                    <MicOff className="w-5 h-5" />
                    <span> {isLoading ? "Saving..." : `Stop Recording (${recordingTime}s)`}</span>
                  </button>
                )}
                {enrollmentStatus && (
                  <div className="text-center">
                    <div className="inline-flex items-center space-x-2 text-red-600">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span>Recording in progress...</span>
                    </div>
                  </div>
                )}
                {(error || recordingError) && (
                  <div className="mt-4 flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded mb-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error || recordingError}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Success Popup for modal version */}
        {showSuccessPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <div className="flex flex-col items-center text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Success!
                </h3>
                <p className="text-gray-600 mb-6">
                  Doctor voice enrolled successfully!
                </p>
                <button
                  onClick={handleSuccessContinue}
                  className="w-full py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={onClose}
        className="flex items-center gap-2 text-white hover:text-gray-200 absolute top-[-20px] left-[-10px] text-sm"
      >
        <ArrowLeft className="h-5 w-5" />
        Back
      </button>

      <div className="w-full max-w-2xl mx-auto text-center">
        {!enrollmentStatus ? (
          <button onClick={handleStartEnrollment} className="block mx-auto">
            <Image
              src="/Recode.svg"
              alt="Start Recording"
              width={400}
              height={300}
            />
          </button>
        ) : (
          <button onClick={handleStopEnrollment} className="block mx-auto">
            <Image
              src="/Record-Stop.svg"
              alt="Stop Recording"
              width={400}
              height={300}
            />
            <span className="block mt-[-20px] text-white font-medium">
              {isLoading ? "Saving..." : `Stop Recording (${recordingTime}s)`}
            </span>
          </button>
        )}

        <h3 className="text-2xl font-semibold mb-4 mt-6 text-white">Tap to Record</h3>
        <p className="text-lg mb-10 leading-relaxed text-white">
          Please read the following text clearly:
          <br />
          <span className="font-bold text-xl block mt-4">
            &quot;As a medical professional, I authorize the use of voice authentication for secure access. 
            I understand this voice signature will be used exclusively for authorized healthcare interactions 
            and will be stored with the highest level of security and confidentiality.&quot;
          </span>
        </p>

        <div className="space-y-4">
          {!enrollmentStatus ? (
            <button
              onClick={handleStartEnrollment}
              disabled={isLoading}
              className="w-full max-w-sm mx-auto flex items-center justify-center gap-3 py-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
            >
              <Mic className="w-6 h-6" />
              <span className="font-medium">{isLoading ? "Processing..." : "Start Recording"}</span>
            </button>
          ) : (
            <button
              onClick={handleStopEnrollment}
              className="w-full max-w-sm mx-auto flex items-center justify-center gap-3 py-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              <MicOff className="w-6 h-6" />
              <span className="font-medium">
                {isLoading ? "Saving..." : `Stop Recording (${recordingTime}s)`}
              </span>
              {isLoading && (
               <Image
                  src="/loading-svgrepo-com.svg"
                  alt="Start Recording"
                  width={20}
                  height={20}
                />
              )}
            </button>
          )}

          {enrollmentStatus && (
            <div className="text-white flex items-center justify-center gap-2">
              <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
              <span>Recording in progress... Speak clearly</span>
            </div>
          )}

          {(error || recordingError) && (
            <div className="mt-4 flex items-center gap-2 text-red-300 bg-red-900/30 p-4 rounded-lg max-w-sm mx-auto">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error || recordingError}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}