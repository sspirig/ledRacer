"""
Description: Commande d'un bandeau lumineux de type WS2812 depuis un raspberry pico.
Le signal envoyé au bandeau est configuré par défaut sur le GPIO0 du pico.
"""
import re

from bt_controller.module import BtController 
from led_controller import LedController


class BtControllerLed(BtController):
    
    def __init__(self, led_controller, name=None):
        super().__init__(name)
        self._led_controller = led_controller
        self._led_state = True
        self._led_controller.set_random()
    
    def on_rx(self, data): # maximum 20 bytes per message
        data = data.decode('utf-8')
        print(f"data utf-8={data}") # affiche le message reçu
        if re.search("^toggle", data):
            print("toggling")
            self._led_state = not self._led_state  # basculement des led on/off
            if self._led_state:
                self._led_controller.set_led_color(LedController.BLACK)
                self._led_controller.setupLedRacer(self)
            else:
                self._led_controller.set_led_color(LedController.MAGENTA)
            self._led_controller.update_pixel(LedController.MAX_LUMINOSITY_ALLOWED)
        if re.search("^finishRace", data):
            temp = data.split()
            print(f"winner is {temp[1]}");
            if temp[1] == "red":
                self._led_controller.set_led_color(LedController.RED)
            else:
                self._led_controller.set_led_color(LedController.BLUE)
            self._led_controller.update_pixel(LedController.MAX_LUMINOSITY_ALLOWED)
            self._led_state = False
        if re.search("^loopRedBlue", data):
            print("loopRedBlue")
            self._led_controller.loopBlueRed(self)
        if re.search("^moveRed", data):
            print("movingRed")
            temp = data.split()
            
            newPos = self._led_controller.moveRed(int(temp[1]))
            self.send(f"moveRed:"+str(newPos))
            
        if re.search("^moveBlue", data):
            print("movingBlue")	
            temp = data.split()
            
            newPos = self._led_controller.moveBlue(int(temp[1]))
            self.send(f"moveBlue:"+str(newPos))
if __name__ == "__main__":
    led_controller = LedController()
    
    btController = BtControllerLed(led_controller, "ledRacer")
    btController.start()




