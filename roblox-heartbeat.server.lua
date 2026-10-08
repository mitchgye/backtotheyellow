local HttpService = game:GetService("HttpService")

local HEARTBEAT_URL = "https://backtotheyellow.onrender.com/api/roblox/heartbeat"
local HEARTBEAT_INTERVAL_SECONDS = 15

local function sendHeartbeat()
	local success, response = pcall(function()
		return HttpService:RequestAsync({
			Url = HEARTBEAT_URL,
			Method = "POST",
			Headers = {
				["Content-Type"] = "application/json"
			},
			Body = HttpService:JSONEncode({})
		})
	end)

	if not success then
		warn("Roblox heartbeat request failed:", response)
		return
	end

	if not response.Success then
		warn("Roblox heartbeat returned HTTP status:", response.StatusCode)
	end
end

task.spawn(function()
	while true do
		sendHeartbeat()
		task.wait(HEARTBEAT_INTERVAL_SECONDS)
	end
end)
