async autoConnect() {

    // JANGAN requestDevice()

    if (!navigator.bluetooth) {
        return false;
    }

    try {

        const devices =
            await navigator.bluetooth.getDevices();

        if (!devices || !devices.length) {
            return false;
        }

        // Cari device yang tersimpan
        // lalu connectGatt()

        for (const device of devices) {

            try {

                if (!device.gatt) {
                    continue;
                }

                if (!device.gatt.connected) {

                    await device.gatt.connect();

                }

                this.device = device;

                this.connected = true;

                this.deviceName =
                    device.name || "";

                console.log(
                    "Bluetooth Auto Connected:",
                    this.deviceName
                );

                return true;

            }

            catch (error) {

                console.warn(
                    "Auto reconnect gagal:",
                    device.name,
                    error
                );

            }

        }

    }

    catch (error) {

        console.warn(
            "Bluetooth autoConnect error:",
            error
        );

    }

    this.connected = false;

    return false;
}
